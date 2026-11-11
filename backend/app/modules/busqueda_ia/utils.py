import os
import requests
from flask import request, current_app, g
from app.extensions import db
from app.modules.users.models import User
from app.modules.perfil_salud.models import UserProfile

def get_current_user_data() -> dict:
    """
    Obtiene la información del usuario autenticado.
    Primero intenta resolverlo directamente en la base de datos si g.user_id está disponible
    o autenticando con Clerk. Si no, intenta consultar el endpoint /api/me.
    """
    # 1. Si ya se autenticó previamente (ej. decorador @require_auth)
    clerk_user_id = getattr(g, "user_id", None)

    # 2. Si no está en g, intentar autenticar con Clerk si existe el token en headers
    if not clerk_user_id:
        secret_key = os.environ.get("CLERK_SECRET_KEY")
        auth_header = request.headers.get("Authorization")
        if secret_key and auth_header:
            try:
                from clerk_backend_api import Clerk
                from clerk_backend_api.security.types import AuthenticateRequestOptions
                clerk = Clerk(bearer_auth=secret_key)
                request_state = clerk.authenticate_request(request, AuthenticateRequestOptions())
                if request_state.is_signed_in:
                    clerk_user_id = request_state.payload.get("sub")
                    g.user_id = clerk_user_id
            except Exception:
                pass

    # 3. Si tenemos clerk_user_id, resolver directamente en la BD
    if clerk_user_id:
        user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
        if not user:
            try:
                user = User(clerk_user_id=clerk_user_id)
                db.session.add(user)
                db.session.flush()
                profile = UserProfile(user_id=user.id, onboarding_completed=False)
                db.session.add(profile)
                db.session.commit()
            except Exception:
                db.session.rollback()
                user = User.query.filter_by(clerk_user_id=clerk_user_id).first()

        if user:
            return {
                "id": user.id,
                "role": user.role,
                "clerk_user_id": clerk_user_id
            }

    # 4. Fallback: Llamada HTTP al endpoint /api/me
    base_url = current_app.config.get("INTERNAL_API_BASE_URL", "http://localhost:5000")
    url = f"{base_url}/api/me"

    headers = {}
    if "Authorization" in request.headers:
        headers["Authorization"] = request.headers["Authorization"]

    try:
        response = requests.get(
            url, 
            headers=headers, 
            cookies=request.cookies, 
            timeout=5
        )
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            raise PermissionError("Usuario no autenticado.")
        else:
            raise RuntimeError(f"Error al obtener usuario de /api/me: {response.status_code}")

    except requests.RequestException as e:
        raise RuntimeError(f"No se pudo conectar con la API interna de usuario (/api/me): {str(e)}")
