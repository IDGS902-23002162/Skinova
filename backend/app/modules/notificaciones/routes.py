import logging
from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.extensions import db
from app.modules.users.models import User
from app.modules.perfil_salud.models import UserProfile
from app.modules.notificaciones.services import NotificationService

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

def _get_authenticated_user_id() -> str:
    """Obtiene el ID interno del usuario a partir del clerk_user_id de g."""
    clerk_user_id = getattr(g, 'user_id', None)
    if not clerk_user_id:
        raise PermissionError("Usuario no autenticado en Clerk.")

    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        try:
            user = User(clerk_user_id=clerk_user_id)
            db.session.add(user)
            db.session.flush()
            profile = UserProfile(user_id=user.id, onboarding_completed=False)
            db.session.add(profile)
            db.session.commit()
        except Exception:
            db.session.rollback()
            user = User.query.filter_by(clerk_user_id=clerk_user_id).first()

    if not user:
        raise RuntimeError("No se pudo obtener ni registrar el usuario en el sistema.")

    return user.id


# =============================================================================
# RF-NOT-14: Historial de notificaciones dentro de la aplicación
# =============================================================================
@notifications_bp.route('', methods=['GET'])
@require_auth
def get_notifications():
    """
    Obtiene el historial de notificaciones del usuario.
    Parámetros de consulta opcionales:
    - category: string (ej. 'routine_morning', 'product_expiry', etc.)
    - group: string ('routine', 'habits', 'progress', 'notices')
    - unread_only: bool ('true'/'false')
    - limit: int (por defecto 50)
    - offset: int (por defecto 0)
    """
    try:
        user_id = _get_authenticated_user_id()
        category = request.args.get('category')
        group = request.args.get('group')
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = max(int(request.args.get('offset', 0)), 0)

        result = NotificationService.get_user_notifications(
            user_id=user_id,
            category=category,
            group=group,
            unread_only=unread_only,
            limit=limit,
            offset=offset
        )

        return jsonify({
            "success": True,
            "data": result["items"],
            "total": result["total"],
            "unread_count": result["unread_count"]
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        logger.error(f"Error al listar notificaciones: {e}")
        return jsonify({"error": "Error interno", "message": str(e)}), 500


@notifications_bp.route('/<notification_id>/read', methods=['PATCH'])
@require_auth
def mark_notification_read(notification_id):
    """Marca una notificación específica como leída (RF-NOT-14)."""
    try:
        user_id = _get_authenticated_user_id()
        success = NotificationService.mark_as_read(notification_id, user_id)
        if not success:
            return jsonify({"error": "Notificación no encontrada"}), 404

        return jsonify({
            "success": True,
            "id": notification_id,
            "message": "Notificación marcada como leída"
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        return jsonify({"error": "Error interno", "message": str(e)}), 500


@notifications_bp.route('/mark-all-read', methods=['POST'])
@require_auth
def mark_all_read():
    """Marca todas las notificaciones pendientes del usuario como leídas (RF-NOT-14)."""
    try:
        user_id = _get_authenticated_user_id()
        updated_count = NotificationService.mark_all_as_read(user_id)
        return jsonify({
            "success": True,
            "updated_count": updated_count,
            "message": f"{updated_count} notificaciones marcadas como leídas"
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        return jsonify({"error": "Error interno", "message": str(e)}), 500


@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@require_auth
def delete_notification(notification_id):
    """Elimina una notificación del historial (RF-NOT-14)."""
    try:
        user_id = _get_authenticated_user_id()
        success = NotificationService.delete_notification(notification_id, user_id)
        if not success:
            return jsonify({"error": "Notificación no encontrada"}), 404

        return jsonify({
            "success": True,
            "id": notification_id,
            "message": "Notificación eliminada correctamente"
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        return jsonify({"error": "Error interno", "message": str(e)}), 500


@notifications_bp.route('/clear', methods=['DELETE'])
@require_auth
def clear_read_notifications():
    """Limpia todas las notificaciones que ya fueron leídas (RF-NOT-14)."""
    try:
        user_id = _get_authenticated_user_id()
        deleted_count = NotificationService.clear_read_notifications(user_id)
        return jsonify({
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Se eliminaron {deleted_count} notificaciones leídas"
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        return jsonify({"error": "Error interno", "message": str(e)}), 500


# =============================================================================
# RF-NOT-11: Configuración individual de cada categoría de notificación
# RF-NOT-12: Horario silencioso
# RF-NOT-13: Adaptación a la zona horaria del usuario
# =============================================================================
@notifications_bp.route('/settings', methods=['GET'])
@require_auth
def get_settings():
    """Obtiene la configuración consolidada de notificaciones del usuario."""
    try:
        user_id = _get_authenticated_user_id()
        settings = NotificationService.get_user_settings(user_id)
        return jsonify({
            "success": True,
            "data": settings
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        return jsonify({"error": "Error interno", "message": str(e)}), 500


@notifications_bp.route('/settings', methods=['PUT'])
@require_auth
def update_settings():
    """
    Actualiza la configuración de notificaciones, horario silencioso y/o zona horaria.
    Cuerpo JSON esperado:
    {
        "categories": { "routine_morning": { "enabled": true, "time": "08:00" }, ... },
        "quietHours": { "enabled": true, "start": "22:00", "end": "07:00" },
        "timezone": "America/Mexico_City"
    }
    """
    try:
        user_id = _get_authenticated_user_id()
        payload = request.get_json() or {}
        updated = NotificationService.update_user_settings(user_id, payload)
        return jsonify({
            "success": True,
            "data": updated,
            "message": "Configuración de notificaciones actualizada exitosamente"
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        return jsonify({"error": "Error interno", "message": str(e)}), 500


@notifications_bp.route('/settings/category/<category_id>', methods=['PATCH'])
@require_auth
def update_category_setting(category_id):
    """
    Actualiza los ajustes de una categoría específica (ej. habilitar/deshabilitar o cambiar hora).
    """
    try:
        user_id = _get_authenticated_user_id()
        patch_data = request.get_json() or {}
        updated = NotificationService.set_category_setting(user_id, category_id, patch_data)
        return jsonify({
            "success": True,
            "category": category_id,
            "data": updated["categories"].get(category_id),
            "message": f"Categoría {category_id} actualizada"
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        return jsonify({"error": "Error interno", "message": str(e)}), 500


# =============================================================================
# Motor de Evaluación y Disparadores (RF-NOT-01 a RF-NOT-10)
# =============================================================================
@notifications_bp.route('/check-reminders', methods=['POST'])
@require_auth
def check_reminders():
    """
    Evalúa automáticamente las rutinas, productos, caducidades y hábitos del usuario,
    y genera las alertas pertinentes según el horario local y preferencias activas.
    """
    try:
        user_id = _get_authenticated_user_id()
        generated = NotificationService.evaluate_all_reminders_for_user(user_id)
        return jsonify({
            "success": True,
            "generated_count": len(generated),
            "data": [n.to_dict() for n in generated]
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        logger.error(f"Error al evaluar recordatorios: {e}")
        return jsonify({"error": "Error al evaluar recordatorios", "message": str(e)}), 500


@notifications_bp.route('/simulate', methods=['POST'])
@require_auth
def simulate_notification():
    """
    Endpoint para probar o generar manualmente cualquier tipo de alerta soportada:
    - routine_morning (RF-NOT-01)
    - routine_night (RF-NOT-02)
    - product_reminder (RF-NOT-03)
    - weekly_reminder (RF-NOT-04)
    - product_expiry (RF-NOT-05)
    - product_replenishment (RF-NOT-06)
    - progress_photo (RF-NOT-07)
    - environmental_alert (RF-NOT-08)
    - subscription (RF-NOT-09)
    - community (RF-NOT-10)
    """
    try:
        user_id = _get_authenticated_user_id()
        data = request.get_json() or {}
        notif_type = data.get("type", "routine_morning")
        force = data.get("force", True)

        notification = None

        if notif_type == "routine_morning":
            notification = NotificationService.create_morning_routine_reminder(user_id)
        elif notif_type == "routine_night":
            notification = NotificationService.create_night_routine_reminder(user_id)
        elif notif_type == "product_reminder":
            notification = NotificationService.create_product_reminder(
                user_id=user_id,
                product_name=data.get("product_name", "Serum de Niacinamida"),
                instruction=data.get("instruction", "Aplica 3 gotas sobre rostro limpio y seco."),
                product_id=data.get("product_id")
            )
        elif notif_type in ["weekly_reminder", "weekly_summary"]:
            notification = NotificationService.create_weekly_reminder(
                user_id=user_id,
                title=data.get("title"),
                message=data.get("message")
            )
        elif notif_type == "product_expiry":
            alerts = NotificationService.check_and_create_expiry_alerts(user_id, days_threshold=30)
            if alerts:
                notification = alerts[0]
            else:
                # Simular una si no hay productos por vencer
                notification = NotificationService.create_notification(
                    user_id=user_id,
                    notif_type="product_expiry",
                    title="⚠️ Producto próximo a caducar",
                    message="Tu Protector Solar FPS 50 caducará en 10 días. Considera planificar su reemplazo.",
                    action_path="/neceser",
                    force=force
                )
        elif notif_type == "product_replenishment":
            alerts = NotificationService.check_and_create_replenishment_alerts(user_id)
            if alerts:
                notification = alerts[0]
            else:
                notification = NotificationService.create_notification(
                    user_id=user_id,
                    notif_type="product_replenishment",
                    title="Reponer producto: Crema Hidratante 🧴",
                    message="Tu Crema Hidratante está casi vacía. Considera reponerla pronto para no pausar tu rutina.",
                    action_path="/neceser",
                    force=force
                )
        elif notif_type == "progress_photo":
            notification = NotificationService.create_progress_photo_reminder(user_id)
        elif notif_type == "environmental_alert":
            notification = NotificationService.create_environmental_alert(
                user_id=user_id,
                alert_type=data.get("alert_type", "uv_high"),
                uv_index=data.get("uv_index", 9.2),
                humidity=data.get("humidity", 18),
                description=data.get("description")
            )
        elif notif_type == "subscription":
            notification = NotificationService.create_subscription_alert(
                user_id=user_id,
                event_type=data.get("event_type", "trial_ending"),
                days_left=data.get("days_left", 3),
                details=data.get("details")
            )
        elif notif_type == "community":
            notification = NotificationService.create_community_notification(
                user_id=user_id,
                interaction_type=data.get("interaction_type", "comment"),
                actor_name=data.get("actor_name", "Dra. Sofía Martínez"),
                post_id=data.get("post_id", "demo-post-1"),
                post_title=data.get("post_title", "Mi experiencia con barrera dañada")
            )
        else:
            # Notificación genérica o personalizada
            notification = NotificationService.create_notification(
                user_id=user_id,
                notif_type=notif_type,
                title=data.get("title", "Aviso Skinova"),
                message=data.get("message", "Nueva notificación en tu cuenta."),
                action_path=data.get("action_path", "/dashboard"),
                force=force
            )

        if not notification:
            return jsonify({
                "success": False,
                "message": "No se generó la notificación (posiblemente categoría deshabilitada o en horario silencioso)."
            }), 200

        return jsonify({
            "success": True,
            "data": notification.to_dict(),
            "message": f"Notificación '{notif_type}' generada con éxito"
        }), 201

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except Exception as e:
        logger.error(f"Error al simular notificación: {e}")
        return jsonify({"error": "Error interno", "message": str(e)}), 500
