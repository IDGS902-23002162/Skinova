from flask import Blueprint, request, jsonify
from app.modules.busqueda_ia.utils import get_current_user_data
from app.services.gemini_service import process_product_analysis

# Declaración del Blueprint
ai_analysis_bp = Blueprint('ai_analysis', __name__, url_prefix='/api/products')

@ai_analysis_bp.route('/analyze', methods=['POST'])
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
            "message": "Debes enviar un termino de busqueda ('search_query') o una imagen en base64 ('image_base64')."
        }), 400

    try:
        user_data = get_current_user_data()
        user_id = user_data.get("id") or user_data.get("user_id")
        
        if not user_id:
            return jsonify({"error": "No se pudo identificar el ID del usuario desde /api/me"}), 400

        # 3. Procesar el análisis mediante Gemini, BD e Historial
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
        return jsonify({
            "error": "Error interno del servidor",
            "message": str(e)
        }), 500