import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db as db_session
from app.modules.ai_history import AiHistory
from Skinova.backend.app.gemini.gemini_payload import build_gemini_payload
from app.gemini.gemini_query_manager import analyze_product_with_gemini


logger = logging.getLogger(__name__)

def save_to_ai_history(
    user_id: str,
    query_text: str,
    gemini_response_raw: str,
    interaction_type: str = "product_query"
) -> Optional[AiHistory]:
    """Limpia el JSON retornado por Gemini y lo guarda en la tabla 'ai_history'."""
    try:
        clean_json_str = gemini_response_raw.strip()
        if clean_json_str.startswith("```json"):
            clean_json_str = clean_json_str[7:]
        if clean_json_str.startswith("```"):
            clean_json_str = clean_json_str[3:]
        if clean_json_str.endswith("```"):
            clean_json_str = clean_json_str[:-3]
        
        data: Dict[str, Any] = json.loads(clean_json_str.strip())

        history_entry = AiHistory(
            user_id=user_id,
            interaction_type=interaction_type,
            query_text=query_text,
            subject=data.get("subject", query_text),
            summary=data.get("summary", "Análisis completado."),
            result=data.get("raw_result_data", data),
            requires_professional_attention=data.get("requires_professional_attention", False)
        )

        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)

        return history_entry

    except (json.JSONDecodeError, SQLAlchemyError) as e:
        logger.error(f"Error al guardar en ai_history para el usuario {user_id}: {e}")
        db_session.rollback()
        return None


def process_product_analysis(
    user_id: str,
    search_query: Optional[str] = None,
    image_base64: Optional[str] = None,
    image_mime_type: str = "image/jpeg"
) -> Dict[str, Any]:
    if not search_query and not image_base64:
        raise ValueError("Debes proporcionar al menos un término de búsqueda o una imagen.")
    payload = build_gemini_payload(db_session, user_id, search_query)

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

    # 4. Devuelve la respuesta parseada
    return {
        "history_id": history_record.id if history_record else None,
        "analysis": json.loads(raw_response)
    }