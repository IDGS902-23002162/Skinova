import requests
from flask import request, current_app

def get_current_user_data() -> dict:
    """
    Obtiene la información del usuario autenticado consultando el endpoint local /api/me.
    Reenvía las cabeceras de autorización originales.
    """
    # Se construye la URL base local (por defecto http://localhost:5000 o según config)
    base_url = current_app.config.get("INTERNAL_API_BASE_URL", "http://localhost:5000")
    url = f"{base_url}/api/me"

    # Reenviar cabeceras de autenticación (ej. Bearer Token o Cookies)
    headers = {}
    if "Authorization" in request.headers:
        headers["Authorization"] = request.headers["Authorization"]

    try:
        response = requests.get(url, 
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