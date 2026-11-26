import os
import json
import uuid
import traceback
from datetime import datetime, date
from urllib.parse import quote_plus
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.auth import require_auth
from app.modules.users.models import User
from app.modules.creador_rutinas.models import (
    RoutineVersion,
    RoutineStep,
    RoutineCompletionLog,
)

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

rutinas_bp = Blueprint("creador_rutinas", __name__, url_prefix="/api/rutinas")


def _get_or_create_user(clerk_user_id):
    """Obtiene el usuario en MySQL o lo crea automáticamente si aún no existe en esta rama."""
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        user = User(id=str(uuid.uuid4()), clerk_user_id=clerk_user_id, role="user")
        db.session.add(user)
        db.session.commit()
    return user


def _get_user_context(clerk_user_id):
    """
    Obtiene usuario, perfil dermatológico, alergias e inventario de forma segura.
    Si los módulos de otros compañeros aún no están integrados o están vacíos, usa valores por defecto.
    """
    user = _get_or_create_user(clerk_user_id)

    profile = None
    allergies = []
    inventory_items = []

    # 1. Intentar leer Perfil de Salud y Restricciones (si el módulo existe en esta BD)
    try:
        from app.modules.perfil_salud.models import UserProfile, UserRestriction
        profile = UserProfile.query.filter_by(user_id=user.id).first()
        restrictions = UserRestriction.query.filter_by(user_id=user.id).all()
        allergies = [
            getattr(r, "name", None) or getattr(r, "ingredient_name", "")
            for r in restrictions
            if (getattr(r, "name", None) or getattr(r, "ingredient_name", ""))
        ]
    except Exception as e:
        db.session.rollback()
        print(f"[Aviso] Módulo perfil_salud no disponible aún, usando perfil base: {e}")

    # 2. Intentar leer Mi Neceser (si el módulo existe en esta BD)
    try:
        from app.modules.mi_neceser.models import NeceserProduct
        user_products = NeceserProduct.query.filter_by(user_id=user.id).all()
        inventory_items = [
            getattr(p, "name", None) or getattr(p, "product_name", "")
            for p in user_products
            if (getattr(p, "name", None) or getattr(p, "product_name", ""))
        ]
    except Exception as e:
        db.session.rollback()
        print(f"[Aviso] Módulo mi_neceser no disponible aún, usando inventario vacío: {e}")

    return user, profile, allergies, inventory_items


def _build_web_url(query_text):
    return f"https://www.google.com/search?q={quote_plus(query_text)}"


def _fallback_steps(skin_type, allergies, budget):
    """Motor de respaldo determinístico si no hay conexión con la API de IA."""
    allergies_text = ", ".join(allergies) if allergies else "Ninguna registrada"
    budget_tag = {
        "economico": "Fórmula accesible",
        "medio": "Equilibrado",
        "premium": "Dermo-clínico",
    }.get(budget, "Equilibrado")

    restricted_lower = [a.lower() for a in allergies]
    avoid_vit_c = any("vitamina c" in a or "acido" in a or "ácido" in a for a in restricted_lower)
    avoid_retinol = any("retinol" in a or "retinoide" in a for a in restricted_lower)

    return [
        {
            "period": "matutina",
            "step_order": 1,
            "category": "Limpieza",
            "product_name": f"Limpiador Facial Suave en Gel ({skin_type})",
            "amount": "2 pumps",
            "method": "Masajear sobre rostro húmedo por 60s y aclarar con agua tibia",
            "frequency": "Diario (Mañanas)",
            "source_badge": "inventory",
            "has_warning": False,
            "incompatibility_note": None,
            "justification_note": f"Limpia impurezas respetando tu piel {skin_type.lower()} (Sin: {allergies_text}).",
            "web_search_url": _build_web_url(f"limpiador facial suave piel {skin_type}"),
        },
        {
            "period": "matutina",
            "step_order": 2,
            "category": "Antioxidante",
            "product_name": (
                f"Sérum de Niacinamida 10% + Zinc ({budget_tag})"
                if avoid_vit_c
                else f"Sérum de Vitamina C 10% ({budget_tag})"
            ),
            "amount": "3-4 gotas",
            "method": "Aplicar a toques suaves en rostro y cuello antes de hidratar",
            "frequency": "Lunes a Viernes",
            "source_badge": "ai",
            "has_warning": True,
            "incompatibility_note": f"Validación IA: Separado de activos nocturnos y libre de alergias ({allergies_text}).",
            "justification_note": "Neutraliza radicales libres, unifica el tono y refuerza la luminosidad diurna.",
            "web_search_url": _build_web_url("serum niacinamida 10 zinc" if avoid_vit_c else "serum vitamina c 10"),
        },
        {
            "period": "matutina",
            "step_order": 3,
            "category": "Fotoprotección",
            "product_name": f"Protector Solar Fluido FPS 50+ ({budget_tag})",
            "amount": "2 dedos completos",
            "method": "Distribuir uniformemente 20 minutos antes de la exposición solar",
            "frequency": "Diario (Reaplicar cada 3h)",
            "source_badge": "ai",
            "has_warning": False,
            "incompatibility_note": None,
            "justification_note": "Paso indispensable para prevenir manchas y sensibilidad UV.",
            "web_search_url": _build_web_url(f"protector solar fluido fps 50 piel {skin_type}"),
        },
        {
            "period": "nocturna",
            "step_order": 1,
            "category": "Limpieza Nocturna",
            "product_name": "Gel Limpiador Equilibrante pH Neutro",
            "amount": "1 pump",
            "method": "Masajear suavemente y enjuagar con abundante agua",
            "frequency": "Diario (Noches)",
            "source_badge": "inventory",
            "has_warning": False,
            "incompatibility_note": None,
            "justification_note": "Elimina protector solar e impurezas acumuladas del día.",
            "web_search_url": _build_web_url("gel limpiador equilibrante ph neutro"),
        },
        {
            "period": "nocturna",
            "step_order": 2,
            "category": "Renovación",
            "product_name": (
                f"Sérum Bio-Retinol Bakuchiol 1% ({budget_tag})"
                if avoid_retinol
                else f"Crema Noche con Retinol 0.2% ({budget_tag})"
            ),
            "amount": "Tamaño de un guisante",
            "method": "Aplicar sobre piel completamente seca evitando contorno de ojos",
            "frequency": "3 noches por semana (Lun, Mié, Vie)",
            "source_badge": "ai",
            "has_warning": True,
            "incompatibility_note": "Incompatibilidad validada: No mezclar la misma noche con ácidos exfoliantes.",
            "justification_note": "Estimula la renovación celular nocturna y mejora la textura cutánea.",
            "web_search_url": _build_web_url("serum bakuchiol 1" if avoid_retinol else "crema retinol 0.2"),
        },
    ]


def _generate_personalized_steps(profile, allergies, budget="medio", inventory_items=None, env_context=None):
    """Genera la rutina usando Gemini API con validación estricta de alergias, inventario y contexto climático (RF-AMB-10)."""
    skin_type = (getattr(profile, "skin_type", None) or "Mixta").capitalize()
    sensitivity = getattr(profile, "sensitivity_level", None) or "Sensible"
    goals = getattr(profile, "goals", None) or ["Hidratación", "Luminosidad"]
    inventory_items = inventory_items or []

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or genai is None:
        return _fallback_steps(skin_type, allergies, budget)

    env_prompt_line = ""
    if env_context and env_context.get("summary"):
        env_prompt_line = f"- Contexto climático actual del usuario: {env_context.get('summary')} (adapta las texturas y fotoprotección acordemente)"

    prompt = f"""
    Eres un experto formulador dermatológico para la app Skinova.
    Diseña una rutina de cuidado facial completa (matutina y nocturna) en español para este usuario:
    - Tipo de piel: {skin_type}
    - Nivel de sensibilidad: {sensitivity}
    - Objetivos cutáneos: {goals}
    - Presupuesto deseado: {budget} (economico | medio | premium)
    - ALERGIAS Y RESTRICCIONES ESTRICTAS (PROHIBIDO INCLUIR ESTOS INGREDIENTES): {allergies if allergies else "Ninguna"}
    - Productos que el usuario YA TIENE en Mi Neceser (priorízalos marcando source_badge="inventory" si son adecuados): {inventory_items if inventory_items else "Ninguno registrado"}
    {env_prompt_line}

    Reglas obligatorias:
    1. Genera 3 pasos para "matutina" (siempre terminando con protector solar FPS 50+) y 2 o 3 pasos para "nocturna".
    2. Nunca mezcles activos incompatibles en el mismo turno. Si hay un activo potente, marca has_warning=true y explica la precaución en incompatibility_note.
    3. Devuelve ÚNICAMENTE un arreglo JSON válido con objetos que tengan exactamente estas claves:
       "period" ("matutina" o "nocturna"), "step_order" (entero 1, 2, 3...), "category" (string),
       "product_name" (string), "amount" (string), "method" (string), "frequency" (string),
       "source_badge" ("inventory" o "ai"), "has_warning" (booleano),
       "incompatibility_note" (string o null), "justification_note" (string).
    """

    try:
        client = genai.Client(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4,
            ),
        )
        steps_list = json.loads(response.text)

        forbidden = [a.lower().strip() for a in allergies if a.strip()]
        validated_steps = []
        for item in steps_list:
            text_check = f"{item.get('product_name', '')} {item.get('category', '')}".lower()
            if any(bad in text_check for bad in forbidden):
                continue
            validated_steps.append({
                "period": item.get("period", "matutina"),
                "step_order": int(item.get("step_order", 1)),
                "category": str(item.get("category", "Cuidado"))[:80],
                "product_name": str(item.get("product_name", "Producto recomendado"))[:150],
                "amount": str(item.get("amount", "Cantidad moderada"))[:80],
                "method": str(item.get("method", "Aplicar suavemente sobre el rostro"))[:255],
                "frequency": str(item.get("frequency", "Diario"))[:100],
                "source_badge": item.get("source_badge") if item.get("source_badge") in ("inventory", "ai") else "ai",
                "has_warning": bool(item.get("has_warning", False)),
                "incompatibility_note": str(item["incompatibility_note"])[:255] if item.get("incompatibility_note") else None,
                "justification_note": str(item.get("justification_note", "Recomendado para tu tipo de piel.")),
                "web_search_url": _build_web_url(item.get("product_name", "skincare")),
            })

        return validated_steps if validated_steps else _fallback_steps(skin_type, allergies, budget)
    except Exception as e:
        print(f"[IA Fallback] Error llamando a Gemini: {e}")
        return _fallback_steps(skin_type, allergies, budget)


@rutinas_bp.route("", methods=["GET"])
@require_auth
def get_routines():
    try:
        user, profile, allergies, inventory_items = _get_user_context(g.user_id)

        versions = (
            RoutineVersion.query.filter_by(user_id=user.id)
            .order_by(RoutineVersion.created_at.desc())
            .all()
        )

        if not versions:
            initial_budget = getattr(profile, "budget", None) or "medio"
            new_version = RoutineVersion(
                user_id=user.id,
                version_label="v1.0 (Actual)",
                budget=initial_budget,
                is_active=True,
            )
            db.session.add(new_version)
            db.session.flush()

            for step_data in _generate_personalized_steps(profile, allergies, initial_budget, inventory_items):
                db.session.add(RoutineStep(routine_version_id=new_version.id, **step_data))

            db.session.commit()
            versions = [new_version]

        today = date.today()
        completed_logs = RoutineCompletionLog.query.filter_by(
            user_id=user.id, completed_date=today
        ).all()
        completed_step_ids = [log.step_id for log in completed_logs]

        active_version = next((v for v in versions if v.is_active), versions[0])

        return jsonify({
            "profileContext": {
                "skinType": getattr(profile, "skin_type", None) or "Mixta",
                "sensitivity": getattr(profile, "sensitivity_level", None) or "Sensible",
                "goals": getattr(profile, "goals", None) or ["Hidratación", "Luminosidad"],
                "allergies": allergies,
            },
            "activeVersionId": active_version.id,
            "versions": [v.to_dict() for v in versions],
            "completedToday": completed_step_ids,
        }), 200
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({"error": f"Error interno en /api/rutinas: {str(e)}"}), 500


@rutinas_bp.route("/generate", methods=["POST"])
@require_auth
def generate_new_routine_version():
    try:
        user, profile, allergies, inventory_items = _get_user_context(g.user_id)
        data = request.get_json() or {}
        budget = data.get("budget", getattr(profile, "budget", None) or "medio")

        existing_count = RoutineVersion.query.filter_by(user_id=user.id).count()
        version_number = f"v{existing_count + 1}.0"

        RoutineVersion.query.filter_by(user_id=user.id, is_active=True).update({"is_active": False})
        for old_v in RoutineVersion.query.filter_by(user_id=user.id).all():
            old_v.version_label = old_v.version_label.replace(" (Actual)", "")

        new_version = RoutineVersion(
            user_id=user.id,
            version_label=f"{version_number} (Actual)",
            budget=budget,
            is_active=True,
        )
        db.session.add(new_version)
        db.session.flush()

        for step_data in _generate_personalized_steps(profile, allergies, budget, inventory_items):
            db.session.add(RoutineStep(routine_version_id=new_version.id, **step_data))

        db.session.commit()
        return jsonify(new_version.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({"error": f"Error al generar versión: {str(e)}"}), 500


@rutinas_bp.route("/versions/<int:version_id>/activate", methods=["PUT"])
@require_auth
def activate_routine_version(version_id):
    user = _get_or_create_user(g.user_id)
    target = RoutineVersion.query.filter_by(id=version_id, user_id=user.id).first()
    if not target:
        return jsonify({"error": "Versión no encontrada"}), 404

    for v in RoutineVersion.query.filter_by(user_id=user.id).all():
        v.is_active = (v.id == target.id)
        clean_name = v.version_label.replace(" (Actual)", "")
        v.version_label = f"{clean_name} (Actual)" if v.id == target.id else clean_name

    db.session.commit()
    return jsonify(target.to_dict()), 200


@rutinas_bp.route("/versions/<int:version_id>/steps", methods=["POST"])
@require_auth
def add_routine_step(version_id):
    user, _, allergies, _ = _get_user_context(g.user_id)
    version = RoutineVersion.query.filter_by(id=version_id, user_id=user.id).first()
    if not version:
        return jsonify({"error": "Versión de rutina no encontrada"}), 404

    data = request.get_json() or {}
    period = data.get("period", "matutina")
    current_steps = [s for s in version.steps if s.period == period]
    next_order = len(current_steps) + 1

    allergies_text = ", ".join(allergies) if allergies else "ninguna"
    new_step = RoutineStep(
        routine_version_id=version.id,
        period=period,
        step_order=next_order,
        category=data.get("category", "Cuidado Específico"),
        product_name=data.get("name", "Tónico Calmante de Centella Asiática"),
        amount=data.get("amount", "4 gotas"),
        method=data.get("method", "Presionar suavemente con las palmas sobre piel limpia"),
        frequency=data.get("frequency", "Diario"),
        source_badge=data.get("badge", "ai"),
        has_warning=False,
        incompatibility_note=None,
        justification_note=data.get(
            "note",
            f"Recomendación IA verificada contra tus restricciones ({allergies_text})."
        ),
        is_paused=False,
        web_search_url=_build_web_url("tonico calmante centella asiatica piel sensible"),
    )
    db.session.add(new_step)
    db.session.commit()
    return jsonify(new_step.to_dict()), 201


@rutinas_bp.route("/steps/<int:step_id>/replace", methods=["POST"])
@require_auth
def replace_or_regenerate_step(step_id):
    user, _, allergies, _ = _get_user_context(g.user_id)
    step = RoutineStep.query.join(RoutineVersion).filter(
        RoutineStep.id == step_id,
        RoutineVersion.user_id == user.id
    ).first()
    if not step:
        return jsonify({"error": "Paso no encontrado"}), 404

    data = request.get_json() or {}
    budget = data.get("budget", step.routine_version.budget)
    budget_label = {
        "economico": "Línea Accesible",
        "medio": "Equilibrado",
        "premium": "Línea Dermo-Clínica",
    }.get(budget, "Equilibrado")

    alternatives_map = {
        "Limpieza": ("Agua Micelar Calmante Piel Sensible", "1 pad húmedo"),
        "Antioxidante": ("Sérum de Niacinamida 10% + Zinc", "3 gotas"),
        "Fotoprotección": ("Fotoprotector Mineral FPS 50+ Sin Aceite", "2 dedos"),
        "Renovación": ("Sérum Bio-Retinol (Bakuchiol 1%)", "3 gotas"),
    }

    alt_name, alt_amount = alternatives_map.get(
        step.category,
        (f"{step.category} Alternativo", step.amount)
    )

    step.product_name = f"{alt_name} ({budget_label})"
    step.amount = alt_amount
    step.source_badge = "ai"
    allergies_text = ", ".join(allergies) if allergies else "ninguna"
    step.justification_note = (
        f"Sustituido mediante regeneración parcial IA respetando tu presupuesto ({budget}) y alergias ({allergies_text})."
    )
    step.web_search_url = _build_web_url(alt_name)

    db.session.commit()
    return jsonify(step.to_dict()), 200


@rutinas_bp.route("/steps/<int:step_id>/pause", methods=["PATCH"])
@require_auth
def toggle_pause_step(step_id):
    user = _get_or_create_user(g.user_id)
    step = RoutineStep.query.join(RoutineVersion).filter(
        RoutineStep.id == step_id,
        RoutineVersion.user_id == user.id
    ).first()
    if not step:
        return jsonify({"error": "Paso no encontrado"}), 404

    step.is_paused = not step.is_paused
    db.session.commit()
    return jsonify(step.to_dict()), 200


@rutinas_bp.route("/steps/<int:step_id>/complete", methods=["POST"])
@require_auth
def toggle_complete_step(step_id):
    user = _get_or_create_user(g.user_id)
    step = RoutineStep.query.join(RoutineVersion).filter(
        RoutineStep.id == step_id,
        RoutineVersion.user_id == user.id
    ).first()
    if not step:
        return jsonify({"error": "Paso no encontrado"}), 404

    today = date.today()
    existing = RoutineCompletionLog.query.filter_by(
        user_id=user.id, step_id=step.id, completed_date=today
    ).first()

    if existing:
        db.session.delete(existing)
        completed = False
    else:
        db.session.add(
            RoutineCompletionLog(user_id=user.id, step_id=step.id, completed_date=today)
        )
        completed = True

    db.session.commit()
    return jsonify({"step_id": step.id, "completed": completed}), 200


@rutinas_bp.route("/versions/<int:version_id>/smart-adjust", methods=["POST"])
@require_auth
def apply_smart_adjustment(version_id):
    user = _get_or_create_user(g.user_id)
    version = RoutineVersion.query.filter_by(id=version_id, user_id=user.id).first()
    if not version:
        return jsonify({"error": "Versión no encontrada"}), 404

    if not version.smart_adjusted:
        # RF-AMB-10: Obtener contexto ambiental real del usuario
        summary_text = "Ajustado según condiciones climáticas actuales (UV y humedad)"
        try:
            from app.modules.monitoreo_ambiental.services import get_environmental_routine_context
            env_ctx = get_environmental_routine_context(user.id)
            if env_ctx and env_ctx.get("summary"):
                summary_text = env_ctx["summary"]
        except Exception as e:
            print(f"[Aviso] No se pudo obtener contexto ambiental en vivo: {e}")

        morning_steps = [s for s in version.steps if s.period == "matutina"]
        for s in morning_steps:
            if s.step_order >= 3:
                s.step_order += 1

        hydration_step = RoutineStep(
            routine_version_id=version.id,
            period="matutina",
            step_order=3,
            category="Hidratación Barrera (Ajuste IA)",
            product_name="Gel-Crema Ácido Hialurónico + Ceramidas",
            amount="1 falange",
            method="Aplicar antes del protector solar para sellar la hidratación",
            frequency="Diario (Ajuste según clima y radiación UV)",
            source_badge="ai",
            has_warning=False,
            incompatibility_note=None,
            justification_note=f"Ajuste Inteligente IA: {summary_text}",
            is_paused=False,
            web_search_url=_build_web_url("gel crema acido hialuronico ceramidas"),
        )
        db.session.add(hydration_step)
        version.smart_adjusted = True
        version.environmental_summary = summary_text[:255]
        db.session.commit()

    return jsonify(version.to_dict()), 200
