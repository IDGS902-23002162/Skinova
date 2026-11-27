import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm.attributes import flag_modified

from app.extensions import db
from app.modules.ai_history.models import AiHistory
from app.gemini.gemini_payload import build_gemini_payload
from app.gemini.gemini_query_manager import analyze_product_with_gemini, chat_product_with_gemini

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


def process_product_chat(
    user_id: str,
    message: str,
    history_id: Optional[str] = None,
    product_analysis: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    clean_message = (message or "").strip()
    if not clean_message:
        raise ValueError("El mensaje no puede estar vacío.")

    entry = None
    if history_id:
        entry = AiHistory.query.filter_by(id=str(history_id), user_id=user_id).first()

    analysis_context = (entry.result if entry and isinstance(entry.result, dict) else None) or product_analysis or {}
    prior_messages = (
        analysis_context.get("chat_messages")
        if isinstance(analysis_context, dict) and isinstance(analysis_context.get("chat_messages"), list)
        else (chat_history or [])
    )

    subject = (
        (entry.subject if entry else None)
        or (analysis_context.get("subject") if isinstance(analysis_context, dict) else None)
        or "Consulta de producto"
    )
    payload = build_gemini_payload(db.session, user_id, subject)

    reply_text = chat_product_with_gemini(
        payload=payload,
        product_analysis=analysis_context if isinstance(analysis_context, dict) else None,
        chat_history=prior_messages,
        user_message=clean_message,
    )
    if not reply_text:
        reply_text = "No pude generar una respuesta en este momento. Intenta reformular tu pregunta."

    now_time = datetime.now(timezone.utc).strftime("%H:%M")

    # ponytail: persist chat turns inside AiHistory.result JSON to avoid a DB migration; add a chat_messages table if queries/pagination are needed later.
    if entry is not None:
        result_data = dict(entry.result) if isinstance(entry.result, dict) else {}
        stored_msgs = list(result_data.get("chat_messages") or [])
        stored_msgs.append({"role": "user", "content": clean_message, "time": now_time})
        stored_msgs.append({"role": "assistant", "content": reply_text, "time": now_time})
        result_data["chat_messages"] = stored_msgs
        entry.result = result_data
        flag_modified(entry, "result")
        db.session.commit()

    return {
        "history_id": entry.id if entry else history_id,
        "reply": reply_text,
        "time": now_time,
    }
