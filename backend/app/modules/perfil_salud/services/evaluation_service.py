import json
import logging
import os
from typing import Dict, Any, Optional

from app.extensions import db
from app.modules.perfil_salud.models import UserProfile, UserRestriction, SkinEvaluation
from app.modules.ai_history.models import AiHistory
from app.gemini.gemini_query_manager import analyze_skin_with_gemini

logger = logging.getLogger(__name__)

def _clean_json_markdown(raw_str: str) -> str:
    """Remueve bloques ```json o ``` de respuestas markdown de Gemini."""
    clean = raw_str.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()

def process_skin_analysis(
    user_id: str,
    image_base64: Optional[str] = None,
    image_mime_type: str = "image/jpeg",
    user_description: Optional[str] = None,
    apply_to_profile: bool = False,
    is_onboarding: bool = False
) -> Dict[str, Any]:
    """
    Procesa un análisis de piel utilizando Gemini a partir de una imagen y/o descripción.
    Persiste el resultado en `SkinEvaluation` y en `AiHistory`, y opcionalmente
    actualiza el `UserProfile` con los tipos y metas inferidos.
    """
    if not image_base64 and not (user_description and user_description.strip()):
        raise ValueError("Debes proporcionar al menos una imagen o una descripción de tu piel para realizar el análisis.")

    # 1. Recopilar contexto del usuario
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    restrictions = UserRestriction.query.filter_by(user_id=user_id, active=True).all()

    user_context = {
        "preferred_name": profile.preferred_name if profile and profile.preferred_name else "Usuario",
        "current_skin_type": profile.skin_type if profile else None,
        "current_sensitivity": profile.sensitivity_level if profile else None,
        "goals": profile.goals if profile and profile.goals else [],
        "allergies": [r.name for r in restrictions if r.type == 'allergy'],
        "sensitivities": [r.name for r in restrictions if r.type == 'sensitivity'],
        "dermatological_history": profile.dermatological_history if profile and profile.dermatological_history else []
    }

    # 2. Consultar Gemini
    raw_response = analyze_skin_with_gemini(
        user_context=user_context,
        user_description=user_description,
        image_base64=image_base64,
        image_mime_type=image_mime_type
    )

    clean_json_str = _clean_json_markdown(raw_response)
    try:
        parsed_data = json.loads(clean_json_str)
    except json.JSONDecodeError as err:
        logger.error(f"Error parseando JSON de Gemini para análisis de piel: {err}")
        raise ValueError("La respuesta del modelo de IA no pudo ser interpretada correctamente.")

    metrics = parsed_data.get("metrics", {})
    summary = parsed_data.get("summary", "")
    warnings = parsed_data.get("warnings", [])
    requires_prof = parsed_data.get("requires_professional_attention", False)
    suggested_skin_type = parsed_data.get("suggested_skin_type", "combination")
    suggested_sensitivity = parsed_data.get("suggested_sensitivity_level", "medium")
    suggested_goals = parsed_data.get("suggested_goals", [])

    model_used = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")

    # 3. Guardar en la tabla skin_evaluations
    evaluation = SkinEvaluation(
        user_id=user_id,
        metrics_json=metrics,
        summary=summary,
        warnings_json=warnings,
        requires_professional_attention=requires_prof,
        confirmed=True,
        ai_provider="google-genai",
        ai_model=model_used
    )
    db.session.add(evaluation)

    # 4. Si se solicita o es onboarding, actualizar el perfil
    if (apply_to_profile or is_onboarding) and profile:
        if suggested_skin_type:
            profile.skin_type = suggested_skin_type
        if suggested_sensitivity:
            profile.sensitivity_level = suggested_sensitivity
        if suggested_goals:
            profile.goals = suggested_goals

    # 5. Guardar en AiHistory para trazabilidad
    history_entry = AiHistory(
        user_id=user_id,
        interaction_type="skin_analysis",
        query_text=user_description or "[Análisis fotográfico de piel]",
        subject="Evaluación de Piel con IA",
        summary=summary[:255] if summary else "Análisis cutáneo completado.",
        result=parsed_data,
        requires_professional_attention=requires_prof
    )
    db.session.add(history_entry)

    db.session.commit()
    db.session.refresh(evaluation)

    return {
        "id": evaluation.id,
        "created_at": evaluation.created_at.isoformat(),
        "metrics": evaluation.metrics_json,
        "summary": evaluation.summary,
        "warnings": evaluation.warnings_json,
        "requires_professional_attention": evaluation.requires_professional_attention,
        "confirmed": evaluation.confirmed,
        "suggested_skin_type": suggested_skin_type,
        "suggested_sensitivity_level": suggested_sensitivity,
        "suggested_goals": suggested_goals
    }

