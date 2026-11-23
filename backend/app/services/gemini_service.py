import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.modules.ai_history.models import AiHistory
from app.gemini.gemini_payload import build_gemini_payload
from app.gemini.gemini_query_manager import analyze_product_with_gemini

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

def save_to_ai_history(
    user_id: str,
    query_text: str,
    gemini_response_raw: str,
    interaction_type: str = "product_query"
) -> Optional[AiHistory]:
    """Limpia el JSON retornado por Gemini y lo guarda en la tabla 'ai_history'."""
    try:
        clean_json_str = _clean_json_markdown(gemini_response_raw)
        data: Dict[str, Any] = json.loads(clean_json_str)

        history_entry = AiHistory(
            user_id=user_id,
            interaction_type=interaction_type,
            query_text=query_text,
            subject=data.get("subject", query_text),
            summary=data.get("summary", "Análisis completado."),
            result=data.get("raw_result_data", data),
            requires_professional_attention=data.get("requires_professional_attention", False)
        )

        db.session.add(history_entry)
        db.session.commit()
        db.session.refresh(history_entry)

        return history_entry

    except (json.JSONDecodeError, SQLAlchemyError) as e:
        logger.error(f"Error al guardar en ai_history para el usuario {user_id}: {e}")
        db.session.rollback()
        return None


def process_product_analysis(
    user_id: str,
    search_query: Optional[str] = None,
    image_base64: Optional[str] = None,
    image_mime_type: str = "image/jpeg"
) -> Dict[str, Any]:
    if not search_query and not image_base64:
        raise ValueError("Debes proporcionar al menos un término de búsqueda o una imagen.")

    payload = build_gemini_payload(db.session, user_id, search_query)

    raw_response = analyze_product_with_gemini(
        payload=payload,
        image_base64=image_base64,
        image_mime_type=image_mime_type
    )

    query_label = search_query or "[Análisis por foto de producto]"
    history_record = save_to_ai_history(
        user_id=user_id,
        query_text=query_label,
        gemini_response_raw=raw_response,
        interaction_type="product_query"
    )

    clean_response_str = _clean_json_markdown(raw_response)
    try:
        parsed_analysis = json.loads(clean_response_str)
    except json.JSONDecodeError:
        parsed_analysis = {
            "subject": query_label,
            "summary": raw_response,
            "key_ingredients": [],
            "compatibility": {"is_compatible": True, "score": 80, "profile_match_reason": "Información obtenida de Gemini."},
            "warnings": [],
            "requires_professional_attention": False
        }

    return {
        "history_id": history_record.id if history_record else None,
        "analysis": parsed_analysis
    }
