from flask import Blueprint, request, jsonify
from app.auth import require_auth
from app.extensions import db
from app.modules.busqueda_ia.utils import get_current_user_data
from app.modules.ai_history.models import AiHistory
from app.services.gemini_service import process_product_analysis

# Declaración del Blueprint
ai_analysis_bp = Blueprint('ai_analysis', __name__, url_prefix='/api/products')

@ai_analysis_bp.route('/analyze', methods=['POST'])
@require_auth
def analyze_product_endpoint():
    """
    Endpoint para analizar productos de skincare por texto, imagen Base64 o ambos.
    
    Body esperado (JSON):
    {
        "search_query": "CeraVe Foaming Cleanser",  # opcional
        "image_base64": "data:image/jpeg;base64,...", # opcional
        "image_mime_type": "image/jpeg"              # opcional
    }
    """
    data = request.get_json() or {}

    search_query = data.get("search_query")
    image_base64 = data.get("image_base64")
    image_mime_type = data.get("image_mime_type", "image/jpeg")

    if not search_query and not image_base64:
        return jsonify({
            "error": "Petición inválida", 
            "message": "Debes enviar un término de búsqueda ('search_query') o una imagen en base64 ('image_base64')."
        }), 400

    try:
        user_data = get_current_user_data()
        user_id = user_data.get("id") or user_data.get("user_id")
        
        if not user_id:
            return jsonify({"error": "No se pudo identificar el ID del usuario"}), 400

        # Procesar el análisis mediante Gemini, BD e Historial
        result = process_product_analysis(
            user_id=user_id,
            search_query=search_query,
            image_base64=image_base64,
            image_mime_type=image_mime_type
        )

        return jsonify({
            "success": True,
            "data": result
        }), 200

    except PermissionError as pe:
        return jsonify({"error": "No autorizado", "message": str(pe)}), 401
    except ValueError as ve:
        return jsonify({"error": "Datos inválidos", "message": str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "Error interno del servidor",
            "message": str(e)
        }), 500


@ai_analysis_bp.route('/history', methods=['GET'])
@require_auth
def get_ai_history():
    """
    Obtiene el historial de consultas de IA para el usuario autenticado.
    """
    try:
        user_data = get_current_user_data()
        user_id = user_data.get("id") or user_data.get("user_id")

        if not user_id:
            return jsonify({"error": "No se pudo identificar el ID del usuario"}), 400

        records = AiHistory.query.filter_by(user_id=user_id)\
            .order_by(AiHistory.created_at.desc())\
            .all()

        history_items = []
        for r in records:
            history_items.append({
                "id": r.id,
                "title": r.subject or r.query_text or "Consulta de producto",
                "preview": r.summary or "Análisis completado.",
                "time": r.created_at.strftime("%H:%M") if r.created_at else "",
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "interaction_type": r.interaction_type,
                "query_text": r.query_text,
                "requires_professional_attention": r.requires_professional_attention,
                "flagged": r.requires_professional_attention,
                "analysis": r.result
            })

        return jsonify({
            "success": True,
            "data": history_items
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Error interno al recuperar historial",
            "message": str(e)
        }), 500


@ai_analysis_bp.route('/history/<history_id>', methods=['DELETE'])
@require_auth
def delete_ai_history_item(history_id):
    """
    Elimina una consulta específica del historial del usuario autenticado.
    """
    try:
        user_data = get_current_user_data()
        user_id = user_data.get("id") or user_data.get("user_id")

        if not user_id:
            return jsonify({"error": "No se pudo identificar el ID del usuario"}), 400

        entry = AiHistory.query.filter_by(id=history_id, user_id=user_id).first()
        if not entry:
            return jsonify({"error": "Registro no encontrado"}), 404

        db.session.delete(entry)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Registro eliminado exitosamente."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Error al eliminar registro",
            "message": str(e)
        }), 500
