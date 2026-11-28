import os
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy import func
from flask import Blueprint, request, jsonify, g
from clerk_backend_api import Clerk
from app.extensions import db
from app.auth import require_auth
from app.modules.users.models import User, Subscription
from app.modules.perfil_salud.models import UserProfile
from app.modules.mobil.models import (
    PwaVisit, UserActivityLog, ApiRequestLog, SystemLog, get_app_settings, save_app_setting
)
from app.modules.notificaciones.models import Notification

mobil_bp = Blueprint('mobil', __name__, url_prefix='/api/mobil')


def get_clerk_client():
    secret_key = os.environ.get("CLERK_SECRET_KEY")
    if secret_key:
        return Clerk(bearer_auth=secret_key)
    return None


def fetch_clerk_users_safely(clerk):
    """Obtiene la lista de usuarios de Clerk de forma compatible con distintas versiones del SDK."""
    if not clerk:
        return []
    try:
        res = clerk.users.list(request={"limit": 50})
        return res if isinstance(res, list) else getattr(res, 'data', [])
    except Exception:
        try:
            res = clerk.users.list()
            return res if isinstance(res, list) else getattr(res, 'data', [])
        except Exception as e:
            print(f"Error al obtener usuarios de Clerk: {e}")
            return []


def _extract_clerk_primary_email(clerk_user):
    """Extrae el correo electrónico principal de un objeto usuario de Clerk."""
    if not clerk_user:
        return None
    email_addresses = getattr(clerk_user, 'email_addresses', None) or []
    if not email_addresses:
        return None

    primary_id = getattr(clerk_user, 'primary_email_address_id', None)
    if primary_id:
        for em in email_addresses:
            if getattr(em, 'id', None) == primary_id and getattr(em, 'email_address', None):
                return em.email_address

    first_email = getattr(email_addresses[0], 'email_address', None)
    return first_email or None


def _resolve_actor_email(user_id):
    """
    Resuelve siempre el correo electrónico del actor (admin) que ejecuta la acción.
    Busca primero en Clerk y luego en la tabla local User.
    """
    if not user_id or str(user_id).lower() == "sistema":
        return "sistema"

    uid_str = str(user_id).strip()
    if "@" in uid_str:
        return uid_str

    # 1. Buscar usuario local para obtener tanto id interno como clerk_user_id
    local_user = User.query.filter_by(clerk_user_id=uid_str).first()
    if not local_user:
        local_user = User.query.get(uid_str)

    clerk_id = local_user.clerk_user_id if (local_user and local_user.clerk_user_id) else uid_str

    # 2. Consultar en Clerk por clerk_id para obtener su correo real
    clerk = get_clerk_client()
    if clerk and clerk_id:
        try:
            cu = clerk.users.get(user_id=clerk_id)
            email = _extract_clerk_primary_email(cu)
            if email:
                return email
        except Exception as e:
            print(f"No se pudo resolver correo desde Clerk para {clerk_id}: {e}")

    # 3. Respaldo si el modelo local tuviera campo email o fallback legible
    if local_user:
        local_email = getattr(local_user, 'email', None)
        if local_email:
            return local_email
        return f"user_{str(local_user.id)[:8]}@skinovaapp.com"

    return uid_str


def record_audit_log(
    event_type: str,
    action: str,
    purpose: str,
    component: str,
    result: str,
    actor_id: str = None,
    target: str = None,
    ip: str = None,
):
    """
    Registra un evento con trazabilidad completa en SystemLog:
    - Quién: correo electrónico resuelto del actor
    - Qué: action + target
    - Para qué: purpose
    - Módulo: component
    - Resultado: result
    """
    SystemLog.__table__.create(db.engine, checkfirst=True)
    raw_actor = actor_id if actor_id is not None else getattr(g, 'user_id', 'sistema')
    actor_email = _resolve_actor_email(raw_actor)

    payload = {
        "action": action,
        "purpose": purpose,
        "result": result,
        "target": target,
        "ip": ip,
    }

    db.session.add(SystemLog(
        event_type=event_type,
        message=json.dumps(payload, ensure_ascii=False),
        origin=actor_email,
        component=component,
    ))


def _get_admin_courtesy_user_ids():
    """
    Devuelve los user_id cuya última actualización de suscripción fue asignada
    manualmente por un administrador (cortesía, no pago real).
    """
    admin_logs = (
        UserActivityLog.query
        .filter_by(action="admin_subscription_update")
        .order_by(UserActivityLog.created_at.asc())
        .all()
    )
    courtesy_users = set()
    for log in admin_logs:
        details = (log.details or "").lower()
        if "premium" in details and ("activo" in details or "active" in details):
            courtesy_users.add(log.user_id)
        else:
            courtesy_users.discard(log.user_id)
    return courtesy_users


def _count_pwa_sessions(start_dt=None, end_dt=None):
    """
    Cuenta visitas reales a la PWA (1 visita por usuario por día + entradas anónimas al dashboard),
    evitando que navegar entre múltiples módulos infle el contador de visitas.
    """
    auth_query = db.session.query(
        func.count(
            func.distinct(
                func.concat(PwaVisit.user_id, '_', func.date(PwaVisit.created_at))
            )
        )
    ).filter(PwaVisit.user_id.isnot(None))

    anon_query = PwaVisit.query.filter(
        PwaVisit.user_id.is_(None),
        PwaVisit.module_name == 'dashboard'
    )

    if start_dt is not None:
        auth_query = auth_query.filter(PwaVisit.created_at >= start_dt)
        anon_query = anon_query.filter(PwaVisit.created_at >= start_dt)
    if end_dt is not None:
        auth_query = auth_query.filter(PwaVisit.created_at < end_dt)
        anon_query = anon_query.filter(PwaVisit.created_at < end_dt)

    auth_sessions = auth_query.scalar() or 0
    anon_sessions = anon_query.count() or 0
    return auth_sessions + anon_sessions


@mobil_bp.route('/dashboard/stats', methods=['GET'])
@require_auth
def get_dashboard_analytics():
    try:
        now_naive = datetime.utcnow()
        now_utc = datetime.now(timezone.utc)
        thirty_days_ago = now_naive - timedelta(days=30)
        sixty_days_ago = now_naive - timedelta(days=60)

        # 1. Usuarios registrados
        db_users = User.query.all()
        clerk = get_clerk_client()
        clerk_users_map = {}
        if clerk:
            for cu in fetch_clerk_users_safely(clerk):
                clerk_users_map[cu.id] = cu

        total_registered = max(len(db_users), len(clerk_users_map))

        users_prev_period = 0
        users_current_period = 0
        for u in db_users:
            u_created = u.created_at
            if u_created:
                if getattr(u_created, 'tzinfo', None) is not None:
                    u_created = u_created.replace(tzinfo=None)
                if u_created >= thirty_days_ago:
                    users_current_period += 1
                elif u_created >= sixty_days_ago:
                    users_prev_period += 1

        if users_prev_period > 0:
            users_growth_val = round(((users_current_period - users_prev_period) / users_prev_period) * 100, 1)
            users_growth_str = f"{'+' if users_growth_val >= 0 else ''}{users_growth_val}%"
        elif users_current_period > 0:
            users_growth_str = "+100%"
        else:
            users_growth_str = "0%"

        # 2. Usuarios activos reales (últimos 7 días)
        seven_days_ago_ts = int((now_utc - timedelta(days=7)).timestamp() * 1000)
        active_users_count = 0
        if clerk_users_map:
            for cu in clerk_users_map.values():
                last_active = getattr(cu, 'last_active_at', None) or getattr(cu, 'last_sign_in_at', None)
                if last_active and last_active >= seven_days_ago_ts:
                    active_users_count += 1
        else:
            active_users_count = (
                UserActivityLog.query
                .filter(UserActivityLog.created_at >= thirty_days_ago)
                .distinct(UserActivityLog.user_id)
                .count()
            )

        # 3. Visitas reales a la PWA
        total_visits = _count_pwa_sessions()
        visits_month = _count_pwa_sessions(start_dt=thirty_days_ago)
        visits_prev = _count_pwa_sessions(start_dt=sixty_days_ago, end_dt=thirty_days_ago)

        if visits_prev > 0:
            visits_growth_val = round(((visits_month - visits_prev) / visits_prev) * 100, 1)
            visits_growth_str = f"{'+' if visits_growth_val >= 0 else ''}{visits_growth_val}%"
        elif visits_month > 0:
            visits_growth_str = "+100%"
        else:
            visits_growth_str = "0%"

        # 4. Suscripciones activas vs. Ingresos reales
        plans_cfg = get_app_settings().get('plans', [])
        premium_cfg = next((p for p in plans_cfg if p.get('code') == 'skinova_premium'), None)
        plan_price_mxn = float(premium_cfg.get('price', 149)) if premium_cfg else 149.0
        courtesy_user_ids = _get_admin_courtesy_user_ids()

        all_premium_subs = Subscription.query.filter(
            Subscription.plan_code == 'skinova_premium'
        ).all()

        active_subs = sum(
            1 for s in all_premium_subs
            if (s.status or '').lower() in ('active', 'activo')
        )

        paid_subs_current_cycle = []
        paid_subs_prev_cycle = []

        for s in all_premium_subs:
            if s.user_id in courtesy_user_ids:
                continue

            status_low = (s.status or '').lower()
            period_end = s.current_period_end
            if period_end and getattr(period_end, 'tzinfo', None) is not None:
                period_end = period_end.replace(tzinfo=None)

            is_paid_this_month = (
                status_low in ('active', 'activo')
                or (status_low in ('cancelado', 'canceled') and period_end and period_end >= now_naive)
            )
            if is_paid_this_month:
                paid_subs_current_cycle.append(s)

            ref_date = getattr(s, 'created_at', None)
            if not ref_date:
                u = User.query.get(s.user_id)
                ref_date = u.created_at if u else None
            if ref_date:
                if getattr(ref_date, 'tzinfo', None) is not None:
                    ref_date = ref_date.replace(tzinfo=None)
                if sixty_days_ago <= ref_date < thirty_days_ago:
                    paid_subs_prev_cycle.append(s)

        monthly_revenue = round(len(paid_subs_current_cycle) * plan_price_mxn, 2)
        prev_revenue = round(len(paid_subs_prev_cycle) * plan_price_mxn, 2)

        if prev_revenue > 0:
            revenue_growth_val = round(((monthly_revenue - prev_revenue) / prev_revenue) * 100, 1)
            revenue_growth_str = f"{'+' if revenue_growth_val >= 0 else ''}{revenue_growth_val}%"
        elif monthly_revenue > 0:
            revenue_growth_str = "+100%"
        else:
            revenue_growth_str = "0%"

        # 5. Tasa de conversión
        unique_visitors_month = (
            db.session.query(func.count(func.distinct(PwaVisit.user_id)))
            .filter(
                PwaVisit.created_at >= thirty_days_ago,
                PwaVisit.user_id.isnot(None),
                PwaVisit.module_name.in_(['dashboard', 'suscripciones'])
            )
            .scalar() or 0
        )

        paid_subs_count = len(paid_subs_current_cycle)
        if unique_visitors_month > 0:
            conversion_rate = min(100.0, round((paid_subs_count / unique_visitors_month) * 100, 1))
        else:
            conversion_rate = 0.0

        # 6. Módulos más utilizados
        module_labels = {
            "rutinas": "Creador de Rutinas",
            "consulta_ia": "Consulta con IA",
            "mi_neceser": "Mi Neceser",
            "progreso": "Bitácora & Progreso",
            "bitacora": "Bitácora & Progreso",
            "habitos": "Hábitos & Desafíos",
            "ambiente": "Monitoreo Ambiental",
            "comunidad": "Comunidad & Foro",
            "directorio": "Dermatólogos",
            "dashboard": "Dashboard Principal",
            "suscripciones": "Planes & Suscripciones",
            "notificaciones": "Notificaciones"
        }

        all_visits = PwaVisit.query.all()
        module_counts = {}
        for v in all_visits:
            mod = v.module_name or "general"
            module_counts[mod] = module_counts.get(mod, 0) + 1

        total_module_visits = sum(module_counts.values()) or 1
        most_used = []
        for mod_key, count in sorted(module_counts.items(), key=lambda x: x[1], reverse=True)[:6]:
            percentage = round((count / total_module_visits) * 100, 1)
            most_used.append({
                "id": mod_key,
                "label": module_labels.get(mod_key, mod_key.replace("_", " ").capitalize()),
                "visits": count,
                "percentage": percentage
            })

        # 7. Histórico de últimos 6 meses
        month_names_es = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        revenue_history = []

        for i in range(5, -1, -1):
            m_date = now_naive - timedelta(days=i * 30)
            m_name = month_names_es[m_date.month - 1]

            if i == 0:
                subs_in_month = len(paid_subs_current_cycle)
            else:
                subs_in_month = 0
                for s in all_premium_subs:
                    if s.user_id in courtesy_user_ids:
                        continue
                    u = User.query.get(s.user_id)
                    if u and u.created_at:
                        u_dt = u.created_at.replace(tzinfo=None) if u.created_at.tzinfo else u.created_at
                        if u_dt < m_date:
                            subs_in_month += 1

            revenue_history.append({
                "month": m_name,
                "revenue": round(subs_in_month * plan_price_mxn, 2),
                "subscribers": subs_in_month
            })

        return jsonify({
            "success": True,
            "overview": {
                "registered_users": total_registered,
                "active_users": active_users_count,
                "total_visits": total_visits,
                "visits_month": visits_month,
                "conversion_rate": conversion_rate,
                "monthly_revenue": monthly_revenue,
                "active_subscriptions": active_subs,
                "currency": "MXN"
            },
            "growth": {
                "users": users_growth_str,
                "revenue": revenue_growth_str,
                "visits": visits_growth_str,
                "period": "vs. periodo anterior"
            },
            "most_used_modules": most_used,
            "revenue_history": revenue_history
        }), 200
    except Exception as e:
        print(f"Error en get_dashboard_analytics: {e}")
        return jsonify({"error": "Error interno al procesar analítica", "detail": str(e)}), 500


@mobil_bp.route('/track-visit', methods=['POST'], strict_slashes=False)
def track_pwa_visit():
    """Registra una visita en un módulo de la PWA sin almacenar datos sensibles como IP."""
    try:
        data = request.get_json(silent=True) or request.form.to_dict() or {}

        raw_module = data.get('module_name') or data.get('module') or 'general'
        raw_path = data.get('path') or data.get('pathname') or '/'

        module_name = str(raw_module).strip()[:50] or 'general'
        path = str(raw_path).strip()[:255] or '/'

        raw_user_id = data.get('user_id') or data.get('clerk_user_id')
        resolved_user_id = None
        if raw_user_id:
            user = User.query.get(str(raw_user_id))
            if not user:
                user = User.query.filter_by(clerk_user_id=str(raw_user_id)).first()
            if user:
                resolved_user_id = user.id

        visit = PwaVisit(
            module_name=module_name,
            path=path,
            user_id=resolved_user_id
        )
        db.session.add(visit)
        db.session.commit()
        return jsonify({"status": "tracked", "id": visit.id, "module": module_name}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error en track_pwa_visit: {e}")
        return jsonify({"error": str(e)}), 500


@mobil_bp.route('/users', methods=['GET'])
@require_auth
def get_admin_users():
    """Consulta lista de usuarios con suscripciones reales y estado de cuenta (sin exponer IPs)."""
    try:
        clerk = get_clerk_client()
        clerk_users = {}
        if clerk:
            for cu in fetch_clerk_users_safely(clerk):
                clerk_users[cu.id] = cu

        db_users = User.query.all()
        existing_clerk_ids = {u.clerk_user_id: u for u in db_users}

        for cid, cu in clerk_users.items():
            if cid not in existing_clerk_ids:
                try:
                    new_u = User(clerk_user_id=cid)
                    db.session.add(new_u)
                    db.session.flush()
                    prof = UserProfile(
                        user_id=new_u.id,
                        preferred_name=f"{getattr(cu, 'first_name', '') or ''} {getattr(cu, 'last_name', '') or ''}".strip() or None,
                        onboarding_completed=False
                    )
                    db.session.add(prof)
                    existing_clerk_ids[cid] = new_u
                except Exception as ex:
                    db.session.rollback()
                    print(f"Sync user error: {ex}")

        db.session.commit()

        db_users = User.query.order_by(User.created_at.desc()).all()
        subscriptions = {s.user_id: s for s in Subscription.query.all()}
        profiles = {p.user_id: p for p in UserProfile.query.all()}
        courtesy_user_ids = _get_admin_courtesy_user_ids()

        q = (request.args.get('q') or '').lower().strip()
        status_filter = (request.args.get('status') or 'all').lower().strip()
        plan_filter = (request.args.get('plan') or 'all').lower().strip()

        now_naive = datetime.utcnow()
        now_utc = datetime.now(timezone.utc)
        now_ts = int(now_utc.timestamp() * 1000)

        users_payload = []
        active_subs_count = 0
        cancelled_subs_count = 0
        expired_subs_count = 0
        new_month_count = 0

        for u in db_users:
            cu = clerk_users.get(u.clerk_user_id)
            prof = profiles.get(u.id)
            sub = subscriptions.get(u.id)

            name = None
            email = None
            avatar = None
            banned = False

            if cu:
                c_first = getattr(cu, 'first_name', '') or ''
                c_last = getattr(cu, 'last_name', '') or ''
                c_full = f"{c_first} {c_last}".strip()
                name = prof.preferred_name if (prof and prof.preferred_name) else (c_full or getattr(cu, 'username', '') or None)
                email = _extract_clerk_primary_email(cu)
                avatar = getattr(cu, 'image_url', None)
                banned = getattr(cu, 'banned', False)

            if not name:
                name = prof.preferred_name if (prof and prof.preferred_name) else f"Usuario #{str(u.id)[:6]}"
            if not email:
                email = f"user_{str(u.id)[:8]}@skinovaapp.com"

            last_active_ts = None
            if cu:
                last_active_ts = getattr(cu, 'last_active_at', None) or getattr(cu, 'last_sign_in_at', None)

            if last_active_ts:
                diff_sec = max(0, (now_ts - last_active_ts) // 1000)
                if diff_sec < 60:
                    last_access_str = "hace un momento"
                elif diff_sec < 3600:
                    last_access_str = f"hace {diff_sec // 60}m"
                elif diff_sec < 86400:
                    last_access_str = f"hace {diff_sec // 3600}h"
                else:
                    last_access_str = f"hace {diff_sec // 86400}d"
                last_access_date = datetime.fromtimestamp(last_active_ts / 1000, tz=timezone.utc).strftime("%d/%m/%Y %H:%M")
            else:
                last_access_str = "Sin actividad"
                last_access_date = "N/A"

            if sub:
                raw_status = (sub.status or '').lower()
                if raw_status in ('active', 'activo'):
                    sub_status = "activo"
                elif raw_status in ('cancelado', 'canceled'):
                    sub_status = "cancelado"
                elif raw_status in ('vencido', 'expired', 'past_due'):
                    sub_status = "vencido"
                else:
                    sub_status = "activo" if sub.plan_code == 'skinova_premium' else "vencido"

                sub_plan = "Premium" if sub.plan_code == 'skinova_premium' else "Gratuito"
                sub_id = sub.id
                end_dt = sub.current_period_end
                cancel_at_period_end = bool(sub.cancel_at_period_end)
            else:
                sub_status = "activo"
                sub_plan = "Gratuito"
                sub_id = None
                end_dt = None
                cancel_at_period_end = False

            if sub_status == 'activo' and sub_plan == 'Premium':
                active_subs_count += 1
            elif sub_status == 'cancelado':
                cancelled_subs_count += 1
            elif sub_status == 'vencido':
                expired_subs_count += 1

            user_created_dt = u.created_at or now_naive
            if getattr(user_created_dt, 'tzinfo', None) is not None:
                user_created_dt = user_created_dt.replace(tzinfo=None)

            if (now_naive - user_created_dt).days <= 30:
                new_month_count += 1

            end_date_str = "N/A"
            if end_dt:
                if getattr(end_dt, 'tzinfo', None) is not None:
                    end_dt = end_dt.replace(tzinfo=None)
                end_date_str = end_dt.strftime("%d/%m/%Y")

            account_status = "suspendido" if banned else ("activo" if sub_status == "activo" else sub_status)

            user_data = {
                "id": u.id,
                "clerk_id": u.clerk_user_id,
                "name": name,
                "email": email,
                "avatar": avatar,
                "role": u.role or "user",
                "account_status": account_status,
                "banned": banned,
                "last_access": last_access_str,
                "last_access_date": last_access_date,
                "created_at": user_created_dt.strftime("%d/%m/%Y"),
                "skin_type": getattr(prof, 'skin_type', None) or "No registrado",
                "subscription": {
                    "id": sub_id,
                    "plan": sub_plan,
                    "status": sub_status,
                    "is_courtesy": u.id in courtesy_user_ids,
                    "start_date": user_created_dt.strftime("%d/%m/%Y"),
                    "end_date": end_date_str,
                    "cancel_at_period_end": cancel_at_period_end
                }
            }

            matches_q = True
            if q:
                matches_q = (
                    q in name.lower() or
                    q in email.lower() or
                    q in sub_plan.lower()
                )

            matches_status = (status_filter == 'all') or (account_status.lower() == status_filter.lower())
            matches_plan = (plan_filter == 'all') or (sub_plan.lower() == plan_filter.lower())

            if matches_q and matches_status and matches_plan:
                users_payload.append(user_data)

        return jsonify({
            "success": True,
            "users": users_payload,
            "stats": {
                "total_users": len(db_users),
                "active_subscriptions": active_subs_count,
                "cancelled_subscriptions": cancelled_subs_count,
                "expired_subscriptions": expired_subs_count,
                "new_this_month": new_month_count
            }
        }), 200
    except Exception as e:
        print(f"Error en get_admin_users: {e}")
        return jsonify({"error": "Error interno al obtener usuarios", "detail": str(e)}), 500


@mobil_bp.route('/users/<user_id>/subscription', methods=['PATCH'])
@require_auth
def update_user_subscription(user_id):
    """Permite al administrador modificar el plan y estado de suscripción de un usuario."""
    try:
        user = User.query.get(user_id) or User.query.filter_by(clerk_user_id=user_id).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        data = request.get_json(silent=True) or {}
        new_plan = data.get('plan')
        new_status = (data.get('status') or '').lower()

        status_map = {
            "activo": "active",
            "active": "active",
            "cancelado": "canceled",
            "canceled": "canceled",
            "vencido": "expired",
            "expired": "expired"
        }
        normalized_status = status_map.get(new_status, "active")

        sub = Subscription.query.filter_by(user_id=user.id).first()
        if not sub:
            sub = Subscription(user_id=user.id)
            db.session.add(sub)

        now_naive = datetime.utcnow()
        if new_plan == "Premium":
            sub.plan_code = "skinova_premium"
            sub.status = normalized_status
            if hasattr(sub, 'current_period_start') and not sub.current_period_start:
                sub.current_period_start = now_naive
            sub.current_period_end = now_naive + timedelta(days=30)
            sub.cancel_at_period_end = (normalized_status == "canceled")
        else:
            sub.plan_code = "free"
            sub.status = normalized_status if new_status else "canceled"
            sub.cancel_at_period_end = True

        target_email = _resolve_actor_email(user.clerk_user_id or user.id)
        end_str = sub.current_period_end.strftime("%d/%m/%Y") if sub.current_period_end else "N/A"

        log = UserActivityLog(
            user_id=user.id,
            action="admin_subscription_update",
            details=f"Plan actualizado a {new_plan} con estado {normalized_status}"
        )
        db.session.add(log)

        record_audit_log(
            event_type='info',
            action=f"Actualización de suscripción a {new_plan} ({normalized_status})",
            purpose="Gestión de plan comercial o asignación de cortesía",
            component='GestionUsuarios',
            result=f"Suscripción actualizada (vence: {end_str})",
            actor_id=g.user_id,
            target=target_email,
        )
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Suscripción actualizada exitosamente",
            "subscription": {
                "plan": "Premium" if sub.plan_code == "skinova_premium" else "Gratuito",
                "plan_code": sub.plan_code,
                "status": sub.status,
                "end_date": sub.current_period_end.strftime("%d/%m/%Y") if sub.current_period_end else None
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@mobil_bp.route('/users/<user_id>/toggle-status', methods=['POST'])
@require_auth
def toggle_user_account_status(user_id):
    """Permite al administrador suspender o reactivar una cuenta de usuario."""
    try:
        user = User.query.get(user_id) or User.query.filter_by(clerk_user_id=user_id).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        clerk = get_clerk_client()
        banned_state = False

        if clerk and user.clerk_user_id:
            try:
                cu = clerk.users.get(user_id=user.clerk_user_id)
                is_banned = getattr(cu, 'banned', False)
                if is_banned:
                    clerk.users.unban(user_id=user.clerk_user_id)
                    banned_state = False
                else:
                    clerk.users.ban(user_id=user.clerk_user_id)
                    banned_state = True
            except Exception as e:
                print(f"Error toggling ban in Clerk: {e}")
                banned_state = not (user.role == 'suspended')

        user.role = 'suspended' if banned_state else 'user'
        target_email = _resolve_actor_email(user.clerk_user_id or user.id)

        log = UserActivityLog(
            user_id=user.id,
            action="admin_toggle_status",
            details=f"Cuenta {'suspendida' if banned_state else 'reactivada'}"
        )
        db.session.add(log)

        record_audit_log(
            event_type='warning' if banned_state else 'info',
            action=f"{'Suspensión' if banned_state else 'Reactivación'} de cuenta de usuario",
            purpose="Moderación y control de seguridad de acceso",
            component='GestionUsuarios',
            result=f"Estado actual: {'Suspendido' if banned_state else 'Activo'}",
            actor_id=g.user_id,
            target=target_email,
        )
        db.session.commit()

        return jsonify({
            "success": True,
            "banned": banned_state,
            "status": "suspendido" if banned_state else "activo",
            "message": f"Usuario {'suspendido' if banned_state else 'reactivado'} correctamente"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@mobil_bp.route('/performance', methods=['GET'])
@require_auth
def get_performance_metrics():
    """Métricas en vivo de rendimiento, endpoints más solicitados, endpoints IA y tráfico por hora."""
    try:
        ApiRequestLog.__table__.create(db.engine, checkfirst=True)

        now_utc = datetime.now(timezone.utc)
        start_of_today = now_utc.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)

        logs = ApiRequestLog.query.all()
        total = len(logs)

        if total > 0:
            avg_response_ms = round(sum(l.duration_ms for l in logs) / total)
            ai_logs = [l for l in logs if l.is_ai]
            ai_avg_response_ms = round(sum(l.duration_ms for l in ai_logs) / len(ai_logs)) if ai_logs else 0
            errors_detected = sum(1 for l in logs if l.status_code >= 400)
            server_errors = sum(1 for l in logs if l.status_code >= 500)
            availability = round(((total - errors_detected) / total) * 100, 1)
            uptime_pct = round(((total - server_errors) / total) * 100, 1)
        else:
            avg_response_ms = 0
            ai_avg_response_ms = 0
            errors_detected = 0
            availability = 100.0
            uptime_pct = 100.0

        requests_today = sum(
            1 for l in logs
            if l.created_at and l.created_at.replace(tzinfo=None) >= start_of_today
        )

        grouped = {}
        for l in logs:
            key = (l.method, l.path)
            entry = grouped.setdefault(key, {
                "method": l.method,
                "path": l.path,
                "calls": 0,
                "totalMs": 0.0,
                "errors": 0,
                "isAi": bool(l.is_ai),
            })
            entry["calls"] += 1
            entry["totalMs"] += l.duration_ms
            if l.status_code >= 400:
                entry["errors"] += 1

        endpoints = [
            {
                "method": e["method"],
                "path": e["path"],
                "calls": e["calls"],
                "avgMs": round(e["totalMs"] / e["calls"]),
                "errors": e["errors"],
                "isAi": e["isAi"],
            }
            for e in grouped.values()
        ]
        endpoints.sort(key=lambda x: x["calls"], reverse=True)
        ai_endpoints = [ep for ep in endpoints if ep["isAi"]]

        now_local = datetime.now()
        hourly_buckets = {}
        ordered_hours = []
        for offset in range(11, -1, -1):
            slot = (now_local - timedelta(hours=offset)).replace(minute=0, second=0, microsecond=0)
            label = slot.strftime("%H:00")
            ordered_hours.append(label)
            hourly_buckets[label] = {"hour": label, "count": 0, "errors": 0}

        cutoff_utc = (now_utc - timedelta(hours=12)).replace(tzinfo=None)
        for l in logs:
            if not l.created_at:
                continue
            created_naive = l.created_at.replace(tzinfo=None)
            if created_naive >= cutoff_utc:
                local_dt = l.created_at.replace(tzinfo=timezone.utc).astimezone()
                label = local_dt.strftime("%H:00")
                if label in hourly_buckets:
                    hourly_buckets[label]["count"] += 1
                    if l.status_code >= 400:
                        hourly_buckets[label]["errors"] += 1

        return jsonify({
            "metrics": {
                "avg_response_ms": avg_response_ms,
                "ai_avg_response_ms": ai_avg_response_ms,
                "requests_today": requests_today,
                "availability": availability,
                "errors_detected": errors_detected,
                "uptime_pct": uptime_pct,
            },
            "endpoints": endpoints,
            "ai_endpoints": ai_endpoints,
            "hourly_requests": [hourly_buckets[h] for h in ordered_hours],
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@mobil_bp.route('/audit/admin-login', methods=['POST'])
@require_auth
def log_admin_login():
    """Registra inicio de sesión exclusivamente si el usuario tiene badge/rol admin en Clerk."""
    try:
        SystemLog.__table__.create(db.engine, checkfirst=True)
        clerk = get_clerk_client()
        if not clerk:
            return jsonify({"logged": False, "reason": "clerk_not_configured"}), 200

        cu = clerk.users.get(user_id=g.user_id)
        role = (getattr(cu, 'public_metadata', None) or {}).get('role')
        if role != 'admin':
            return jsonify({"error": "Solo administradores"}), 403

        admin_email = _extract_clerk_primary_email(cu) or _resolve_actor_email(g.user_id)
        ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'IP desconocida').split(',')[0].strip()

        record_audit_log(
            event_type='login',
            action='Inicio de sesión en panel administrativo',
            purpose='Autenticación y acceso a herramientas de gestión',
            component='AdminGuard',
            result='Acceso concedido (Rol: admin)',
            actor_id=admin_email,
            ip=ip,
        )
        db.session.commit()
        return jsonify({"logged": True}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@mobil_bp.route('/audit/admin-logout', methods=['POST'])
@require_auth
def log_admin_logout():
    """Registra cierre de sesión explícito del administrador."""
    try:
        data = request.get_json(silent=True) or {}
        reason = (data.get('reason') or 'Cierre de sesión manual desde panel').strip()
        ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'IP desconocida').split(',')[0].strip()

        record_audit_log(
            event_type='logout',
            action='Cierre de sesión en panel administrativo',
            purpose=reason,
            component='AdminGuard',
            result='Sesión finalizada correctamente',
            actor_id=g.user_id,
            ip=ip,
        )
        db.session.commit()
        return jsonify({"logged": True}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@mobil_bp.route('/bitacora', methods=['GET'])
@require_auth
def get_admin_bitacora():
    """Devuelve los eventos internos del servidor con trazabilidad completa."""
    try:
        SystemLog.__table__.create(db.engine, checkfirst=True)
        rows = SystemLog.query.order_by(SystemLog.created_at.desc()).limit(200).all()

        counts = {"error": 0, "login": 0, "logout": 0, "warning": 0, "info": 0, "success": 0}
        logs = []
        email_cache = {}

        for r in rows:
            t = r.event_type if r.event_type in counts else "info"
            counts[t] += 1
            dt = r.created_at
            if dt:
                local_dt = dt.replace(tzinfo=timezone.utc).astimezone() if dt.tzinfo is None else dt.astimezone()
                time_str = local_dt.strftime("%d/%m %H:%M:%S")
            else:
                time_str = "--:--:--"

            # Garantizar que logs históricos que guardaron user_id también muestren correo
            raw_origin = r.origin or "sistema"
            if raw_origin not in email_cache:
                email_cache[raw_origin] = _resolve_actor_email(raw_origin)
            actor_email = email_cache[raw_origin]

            action_text = r.message or ""
            purpose_text = ""
            result_text = ""
            target_text = ""
            ip_text = ""

            if action_text.startswith("{"):
                try:
                    parsed = json.loads(action_text)
                    action_text = parsed.get("action") or action_text
                    purpose_text = parsed.get("purpose") or ""
                    result_text = parsed.get("result") or ""
                    target_text = parsed.get("target") or ""
                    ip_text = parsed.get("ip") or ""
                except Exception:
                    pass

            logs.append({
                "id": r.id,
                "type": t,
                "message": action_text,
                "purpose": purpose_text,
                "result": result_text,
                "target": target_text,
                "ip": ip_text,
                "user": actor_email,
                "component": r.component,
                "time": time_str,
            })

        return jsonify({"logs": logs, "counts": counts}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@mobil_bp.route('/admin/config', methods=['GET', 'PUT'])
@require_auth
def admin_config():
    """Consulta y actualiza planes de suscripción y feature flags globales."""
    if request.method == 'GET':
        return jsonify(get_app_settings()), 200

    try:
        data = request.get_json() or {}
        changed_sections = []
        if 'plans' in data and isinstance(data['plans'], list):
            save_app_setting('plans', data['plans'])
            changed_sections.append('planes')
        if 'features' in data and isinstance(data['features'], dict):
            current = get_app_settings()['features']
            current.update(data['features'])
            save_app_setting('features', current)
            changed_sections.append('feature flags')

        sections_label = ", ".join(changed_sections) if changed_sections else "parámetros generales"
        record_audit_log(
            event_type='info',
            action=f"Actualización de configuración global ({sections_label})",
            purpose="Ajuste de planes, precios o disponibilidad de funcionalidades",
            component='Administracion',
            result="Configuración aplicada en producción",
            actor_id=g.user_id,
        )
        db.session.commit()
        return jsonify(get_app_settings()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@mobil_bp.route('/notifications/broadcast', methods=['POST'])
@require_auth
def broadcast_notification():
    """Envía una notificación a todos los usuarios o a un segmento (premium/free)."""
    try:
        data = request.get_json() or {}
        message = (data.get('message') or '').strip()
        segment = data.get('segment', 'all')
        if not message:
            return jsonify({"error": "El mensaje es obligatorio"}), 400

        users = User.query.all()
        active_premium_ids = {
            s.user_id for s in Subscription.query.filter_by(plan_code='skinova_premium').all()
            if (s.status or '').lower() in ('active', 'activo')
        }

        if segment == 'premium':
            target_ids = [u.id for u in users if u.id in active_premium_ids]
        elif segment == 'free':
            target_ids = [u.id for u in users if u.id not in active_premium_ids]
        else:
            target_ids = [u.id for u in users]

        notifs = [
            Notification(
                user_id=uid,
                type='admin_broadcast',
                title='Aviso de Skinova',
                message=message,
                action_path='/notificaciones',
            )
            for uid in target_ids
        ]
        if notifs:
            db.session.bulk_save_objects(notifs)

        preview_msg = f"{message[:60]}..." if len(message) > 60 else message
        record_audit_log(
            event_type='success',
            action=f"Envío masivo de notificación (segmento: {segment})",
            purpose=f"Comunicación oficial: \"{preview_msg}\"",
            component='Administracion',
            result=f"Entregada a {len(target_ids)} destinatarios",
            actor_id=g.user_id,
        )
        db.session.commit()
        return jsonify({"success": True, "sent_count": len(target_ids)}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500