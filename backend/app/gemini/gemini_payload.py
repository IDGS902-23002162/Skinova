from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.perfil_salud.models import UserProfile, UserRestriction
from app.modules.mi_neceser.models import UserProduct

def build_gemini_payload(
    db_session: Any = None, 
    user_id: str = "", 
    search_query: Optional[str] = None
) -> Dict[str, Any]:
    """Consulta la BD y construye el diccionario de contexto para Gemini."""
    
    session = getattr(db_session, 'session', db_session)
    
    # 1. Perfil del usuario
    if session is not None and hasattr(session, 'query'):
        profile = session.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        restrictions = session.query(UserRestriction).filter(
            UserRestriction.user_id == user_id,
            UserRestriction.active == True
        ).all()
        neceser_items = session.query(UserProduct).filter(
            UserProduct.user_id == user_id,
            UserProduct.active == True
        ).all()
    else:
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        restrictions = UserRestriction.query.filter_by(user_id=user_id, active=True).all()
        neceser_items = UserProduct.query.filter_by(user_id=user_id, active=True).all()

    return {
        "search_query": search_query or "Análisis visual de etiqueta/producto",
        "user_profile": {
            "preferred_name": profile.preferred_name if profile and profile.preferred_name else "Usuario",
            "assistant_tone": profile.assistant_tone if profile and profile.assistant_tone else "warm",
            "skin_type": profile.skin_type if profile and profile.skin_type else "not_specified",
            "sensitivity_level": profile.sensitivity_level if profile and profile.sensitivity_level else "medium",
            "goals": profile.goals if profile and profile.goals else [],
            "dermatological_history": profile.dermatological_history if profile and profile.dermatological_history else {}
        },
        "user_restrictions": [
            {
                "type": r.type, 
                "name": r.name, 
                "notes": r.notes
            }
            for r in restrictions
        ],
        "current_neceser": [
            {
                "product_name": item.name,
                "brand": item.brand,
                "category": item.category,
                "inci_ingredients": item.inci,
                "quantity_state": item.quantity_state
            }
            for item in neceser_items
        ]
    }
