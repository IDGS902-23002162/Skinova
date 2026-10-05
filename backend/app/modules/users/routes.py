from flask import Blueprint, request, jsonify, g
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.auth import require_auth
from app.modules.users.models import User
from app.modules.perfil_salud.models import UserProfile, UserRestriction

users_bp = Blueprint('users', __name__, url_prefix='/api')

@users_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    clerk_user_id = g.user_id
    
    # Intenta buscar al usuario
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    
    if not user:
        # El usuario no existe, creamos su cuenta y su perfil atómico
        try:
            user = User(clerk_user_id=clerk_user_id)
            db.session.add(user)
            db.session.flush() # Para obtener el user.id generado

            profile = UserProfile(user_id=user.id, onboarding_completed=False)
            db.session.add(profile)
            
            db.session.commit()
        except IntegrityError:
            # En caso de que otra petición haya creado el usuario concurrentemente
            db.session.rollback()
            user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
            if not user:
                return jsonify({"error": "Failed to create user"}), 500
    
    # Busca su perfil (si por alguna razón existe el user pero no el perfil)
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        try:
            profile = UserProfile(user_id=user.id, onboarding_completed=False)
            db.session.add(profile)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            profile = UserProfile.query.filter_by(user_id=user.id).first()
    
    # Responde con el formato esperado
    return jsonify({
        "id": user.id,
        "role": user.role,
        "onboarding_completed": profile.onboarding_completed,
        "profile": {
            "preferred_name": profile.preferred_name
        }
    }), 200

@users_bp.route('/onboarding', methods=['PUT'])
@require_auth
def update_onboarding():
    clerk_user_id = g.user_id
    
    # Primero encontramos al usuario interno
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid payload"}), 400

    # Actualizamos campos del perfil, ignorando los que no existen
    allowed_fields = [
        'preferred_name', 'assistant_tone', 'skin_type', 'sensitivity_level',
        'goals', 'dermatological_history', 'budget', 'consents', 
        'timezone', 'notification_preferences', 'use_location', 'manual_city'
    ]
    
    try:
        for field in allowed_fields:
            if field in data:
                setattr(profile, field, data[field])
        
        # Guardamos alergias como UserRestriction
        if 'allergies' in data and isinstance(data['allergies'], list):
            # Limpiamos las alergias anteriores para reemplazarlas
            UserRestriction.query.filter_by(user_id=user.id, type='allergy').delete()
            for allergy_name in data['allergies']:
                restriction = UserRestriction(
                    user_id=user.id,
                    type='allergy',
                    name=allergy_name
                )
                db.session.add(restriction)
        
        # Al final, marcamos el onboarding como completado
        profile.onboarding_completed = True
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update onboarding", "details": str(e)}), 500

    return jsonify({
        "message": "Onboarding completed successfully",
        "onboarding_completed": True
    }), 200
