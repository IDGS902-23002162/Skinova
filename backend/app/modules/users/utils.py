from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.modules.users.models import User
from app.modules.perfil_salud.models import UserProfile
from app.modules.mobil.models import get_app_settings

def get_or_create_user_by_clerk_id(clerk_user_id: str):
    """
    Busca al usuario por clerk_user_id. Si no existe y el registro está habilitado,
    crea atómicamente el User y su UserProfile base.
    Retorna: (user, profile, error_response_tuple_or_None)
    """
    user = User.query.filter_by(clerk_user_id=clerk_user_id).first()

    if not user:
        if not get_app_settings().get('features', {}).get('registration_enabled', True):
            return None, None, ({"error": "El registro de nuevos usuarios está deshabilitado", "registration_disabled": True}, 403)
        try:
            user = User(clerk_user_id=clerk_user_id)
            db.session.add(user)
            db.session.flush()

            profile = UserProfile(user_id=user.id, onboarding_completed=False)
            db.session.add(profile)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
            if not user:
                return None, None, ({"error": "Failed to create user"}, 500)

    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        try:
            profile = UserProfile(user_id=user.id, onboarding_completed=False)
            db.session.add(profile)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            profile = UserProfile.query.filter_by(user_id=user.id).first()

    return user, profile, None