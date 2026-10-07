from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.auth import require_auth
from app.modules.users.models import User
from app.modules.perfil_salud.models import UserProfile, UserRestriction

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
