import logging
from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.modules.face_id.service import FaceIdService

logger = logging.getLogger(__name__)

face_id_bp = Blueprint('face_id', __name__, url_prefix='/api/face-id')


@face_id_bp.route('/verify', methods=['POST'])
@require_auth
def verify_face():
    """
    API Contract:
    Verifies that a submitted photograph matches the authenticated user's Clerk profile photo.

    Payload:
    {
        "user_id": "user_xxx",  (optional, must match authenticated user)
        "image": "data:image/jpeg;base64,..."
    }

    Response:
    {
        "success": true,
        "verified": true,
        "similarity": 0.7421,
        "similarity_score": 74.21,
        "threshold": 50.0,
        "error_code": null,
        "message": "Face verified successfully."
    }
    """
    try:
        authenticated_clerk_id = getattr(g, 'user_id', None)
        if not authenticated_clerk_id:
            return jsonify({
                "success": False,
                "verified": False,
                "error": "No autorizado",
                "error_code": "UNAUTHORIZED",
                "message": "Usuario no autenticado en Clerk."
            }), 401

        data = request.get_json(silent=True) or {}

        # If client passed a user_id, ensure they cannot submit another person's user_id
        claimed_user_id = data.get("user_id")
        if claimed_user_id and str(claimed_user_id).strip() != authenticated_clerk_id:
            logger.warning(
                f"User impersonation attempt: authenticated {authenticated_clerk_id} "
                f"attempted verification for {claimed_user_id}"
            )
            return jsonify({
                "success": False,
                "verified": False,
                "error": "Prohibido: el user_id proporcionado no coincide con el usuario autenticado.",
                "error_code": "FORBIDDEN",
                "message": "El user_id proporcionado no coincide con el usuario autenticado."
            }), 403

        image_data = data.get("image")
        if not image_data or not isinstance(image_data, str) or not image_data.strip():
            return jsonify({
                "success": False,
                "verified": False,
                "error": "Falta el parámetro 'image' o es inválido en el cuerpo de la solicitud.",
                "error_code": "INVALID_IMAGE",
                "message": "Falta el parámetro 'image' o es inválido en el cuerpo de la solicitud."
            }), 400

        # Execute face verification against user's Clerk profile photo
        result = FaceIdService.verify_user_photo(
            clerk_user_id=authenticated_clerk_id,
            submitted_image=image_data
        )

        response_body = result.to_dict()
        if not result.verified:
            response_body["error"] = result.message

        status_code = 200 if result.verified else 400
        return jsonify(response_body), status_code

    except Exception as e:
        logger.error(f"Unexpected error in verify_face endpoint: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "verified": False,
            "error": "Error interno en la verificación facial",
            "error_code": "INTERNAL_ERROR",
            "message": str(e)
        }), 500