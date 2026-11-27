import base64
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.auth import require_auth
from app.modules.users.models import User
from app.modules.perfil_salud.models import UserProfile, UserRestriction, SkinEvaluation
from app.modules.busqueda_ia.utils import get_current_user_data
from app.modules.perfil_salud.services.evaluation_service import process_skin_analysis

perfil_salud_bp = Blueprint('perfil_salud', __name__)

@perfil_salud_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    restrictions = UserRestriction.query.filter_by(user_id=user.id).all()
    allergies = [r.name for r in restrictions if r.type == 'allergy']
    sensitivities = [r.name for r in restrictions if r.type == 'sensitivity']

    return jsonify({
        "preferred_name": profile.preferred_name,
        "skin_type": profile.skin_type,
        "sensitivity_level": profile.sensitivity_level,
        "goals": profile.goals or [],
        "dermatological_history": profile.dermatological_history or [],
        "allergies": allergies,
        "sensitivities": sensitivities,
        "budget": profile.budget
    }), 200

@perfil_salud_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile():
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid payload"}), 400

    allowed_fields = [
        'preferred_name', 'skin_type', 'sensitivity_level',
        'goals', 'dermatological_history', 'budget'
    ]
    
    try:
        for field in allowed_fields:
            if field in data:
                setattr(profile, field, data[field])
        
        # Update allergies
        if 'allergies' in data:
            UserRestriction.query.filter_by(user_id=user.id, type='allergy').delete()
            for allergy_name in data['allergies']:
                restriction = UserRestriction(user_id=user.id, type='allergy', name=allergy_name)
                db.session.add(restriction)
                
        # Update sensitivities
        if 'sensitivities' in data:
            UserRestriction.query.filter_by(user_id=user.id, type='sensitivity').delete()
            for sensitivity_name in data['sensitivities']:
                restriction = UserRestriction(user_id=user.id, type='sensitivity', name=sensitivity_name)
                db.session.add(restriction)
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update profile", "details": str(e)}), 500

    return jsonify({"message": "Profile updated successfully"}), 200

@perfil_salud_bp.route('/evaluations', methods=['GET'])
@require_auth
def get_evaluations():
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    from app.modules.perfil_salud.models import SkinEvaluation
    evals = SkinEvaluation.query.filter_by(user_id=user.id).order_by(SkinEvaluation.created_at.desc()).all()
    
    return jsonify([{
        "id": e.id,
        "created_at": e.created_at.isoformat(),
        "metrics": e.metrics_json,
        "summary": e.summary,
        "warnings": e.warnings_json,
        "requires_professional_attention": e.requires_professional_attention,
        "confirmed": e.confirmed
    } for e in evals]), 200

@perfil_salud_bp.route('/evaluations/latest', methods=['GET'])
@require_auth
def get_latest_evaluation():
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    from app.modules.perfil_salud.models import SkinEvaluation
    e = SkinEvaluation.query.filter_by(user_id=user.id).order_by(SkinEvaluation.created_at.desc()).first()
    if not e:
        return jsonify(None), 200
        
    return jsonify({
        "id": e.id,
        "created_at": e.created_at.isoformat(),
        "metrics": e.metrics_json,
        "summary": e.summary,
        "warnings": e.warnings_json,
        "requires_professional_attention": e.requires_professional_attention,
        "confirmed": e.confirmed
    }), 200

@perfil_salud_bp.route('/evaluations/<id>', methods=['GET'])
@require_auth
def get_evaluation(id):
    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    from app.modules.perfil_salud.models import SkinEvaluation
    e = SkinEvaluation.query.filter_by(id=id, user_id=user.id).first()
    if not e:
        return jsonify({"error": "Evaluation not found"}), 404
        
    return jsonify({
        "id": e.id,
        "created_at": e.created_at.isoformat(),
        "metrics": e.metrics_json,
        "summary": e.summary,
        "warnings": e.warnings_json,
        "requires_professional_attention": e.requires_professional_attention,
        "confirmed": e.confirmed
    }), 200

@perfil_salud_bp.route('/evaluations/analyze', methods=['POST'])
@perfil_salud_bp.route('/analyze', methods=['POST'])
@require_auth
def analyze_skin_endpoint():
    """
    Endpoint para analizar la piel del usuario mediante IA (Gemini).
    Acepta:
    - JSON con `image_base64`, `image_mime_type`, `user_description`, `apply_to_profile`, `is_onboarding`
    - FormData con archivo `photo` o `image`, y campos de texto opcionales.
    """
    user_id = None
    try:
        user_data = get_current_user_data()
        user_id = user_data.get("id") or user_data.get("user_id")
    except Exception:
        pass

    if not user_id:
        clerk_user_id = getattr(g, "user_id", None)
        user = User.query.filter_by(clerk_user_id=clerk_user_id).first() if clerk_user_id else None
        if user:
            user_id = user.id

    if not user_id:
        return jsonify({"error": "No se pudo identificar al usuario autenticado"}), 401

    image_base64 = None
    image_mime_type = "image/jpeg"
    user_description = None
    apply_to_profile = False
    is_onboarding = False

    # Revisar si viene por JSON
    if request.is_json:
        data = request.get_json() or {}
        image_base64 = data.get("image_base64")
        image_mime_type = data.get("image_mime_type", "image/jpeg")
        user_description = data.get("user_description")
        apply_to_profile = bool(data.get("apply_to_profile", False))
        is_onboarding = bool(data.get("is_onboarding", False))

    # O si viene por multipart/form-data (archivos)
    elif request.content_type and "multipart/form-data" in request.content_type:
        user_description = request.form.get("user_description")
        apply_to_profile = request.form.get("apply_to_profile", "").lower() in ["true", "1"]
        is_onboarding = request.form.get("is_onboarding", "").lower() in ["true", "1"]

        file = request.files.get("photo") or request.files.get("image")
        if file:
            image_mime_type = file.mimetype or "image/jpeg"
            file_bytes = file.read()
            image_base64 = base64.b64encode(file_bytes).decode("utf-8")

    if not image_base64 and not (user_description and user_description.strip()):
        return jsonify({
            "error": "Petición inválida",
            "message": "Debes proporcionar una imagen ('image_base64' o archivo 'photo') o una descripción de tu piel ('user_description')."
        }), 400

    try:
        result = process_skin_analysis(
            user_id=user_id,
            image_base64=image_base64,
            image_mime_type=image_mime_type,
            user_description=user_description,
            apply_to_profile=apply_to_profile,
            is_onboarding=is_onboarding
        )

        return jsonify({
            "success": True,
            "data": result
        }), 201

    except ValueError as ve:
        return jsonify({"error": "Datos inválidos", "message": str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "Error interno al procesar el análisis de piel con IA",
            "message": str(e)
        }), 500


@perfil_salud_bp.route('/evaluations', methods=['POST'])
@require_auth
def create_evaluation():
    """
    Crea una evaluación de piel.
    - Si se envía imagen ('image_base64' o archivo 'photo') o 'user_description', ejecuta el análisis con IA.
    - Si se envían 'metrics' pregeneradas, las guarda directamente (modo mock / manual).
    """
    if (request.is_json and any(k in (request.get_json() or {}) for k in ["image_base64", "user_description"])) or \
       (request.files and ("photo" in request.files or "image" in request.files)):
        return analyze_skin_endpoint()

    clerk_user_id = g.user_id
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data or 'metrics' not in data:
        return jsonify({"error": "Invalid payload"}), 400

    e = SkinEvaluation(
        user_id=user.id,
        metrics_json=data.get('metrics', {}),
        summary=data.get('summary', ''),
        warnings_json=data.get('warnings', []),
        requires_professional_attention=data.get('requires_professional_attention', False),
        confirmed=True,
        ai_provider=data.get('ai_provider', 'mock'),
        ai_model=data.get('ai_model', 'mock')
    )
    db.session.add(e)
    db.session.commit()

    return jsonify({
        "id": e.id,
        "created_at": e.created_at.isoformat(),
        "metrics": e.metrics_json,
        "summary": e.summary,
        "warnings": e.warnings_json,
        "requires_professional_attention": e.requires_professional_attention,
        "confirmed": e.confirmed
    }), 201

