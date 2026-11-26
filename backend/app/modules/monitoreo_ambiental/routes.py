import uuid
from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.extensions import db
from app.modules.users.models import User
from app.modules.monitoreo_ambiental.services import (
    get_environmental_data,
    get_or_create_user_preferences,
    get_environmental_routine_context,
    search_cities_predictive,
    DEFAULT_CITIES_COORDINATES,
)

ambiente_bp = Blueprint("monitoreo_ambiental", __name__, url_prefix="/api/ambiente")


def _get_or_create_user_id():
    if not hasattr(g, "user_id") or not g.user_id:
        return None
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        user = User(id=str(uuid.uuid4()), clerk_user_id=g.user_id, role="user")
        db.session.add(user)
        db.session.commit()
    return user.id


@ambiente_bp.route("/current", methods=["GET"])
@require_auth
def get_current_environment():
    user_id = _get_or_create_user_id()
    prefs = get_or_create_user_preferences(user_id) if user_id else None

    city_param = request.args.get("city")
    lat_param = request.args.get("lat", type=float)
    lon_param = request.args.get("lon", type=float)
    refresh_param = request.args.get("refresh", "false").lower() in ("true", "1")

    # Si llegan coordenadas GPS sin nombre de ciudad, dejar city=None para que resuelva el nombre real del GPS
    if lat_param is not None and lon_param is not None and not city_param:
        effective_city = None
        effective_lat = lat_param
        effective_lon = lon_param
    else:
        saved_city = prefs.city_name if (prefs and not (prefs.city_name or "").lower().startswith("wakanda")) else "León, Guanajuato"
        effective_city = city_param or saved_city
        effective_lat = lat_param if lat_param is not None else (prefs.latitude if not city_param and prefs else None)
        effective_lon = lon_param if lon_param is not None else (prefs.longitude if not city_param and prefs else None)

    try:
        data = get_environmental_data(
            city_name=effective_city,
            lat=effective_lat,
            lon=effective_lon,
            user_id=user_id,
            force_refresh=refresh_param,
        )
    except ValueError as e:
        return jsonify({"error": str(e), "errorCode": "CITY_NOT_FOUND"}), 400
    except Exception as e:
        return jsonify({"error": f"Servicio meteorológico no disponible: {str(e)}"}), 503

    # Persistir la ubicación resuelta en las preferencias del usuario para limpiar datos viejos
    if prefs and data.get("city"):
        prefs.city_name = data["city"][:150]
        prefs.latitude = data.get("lat")
        prefs.longitude = data.get("lon")
        if lat_param is not None and lon_param is not None and not city_param:
            prefs.use_location = True
        db.session.commit()

    data["syncWithRoutine"] = prefs.sync_with_routine if prefs else True
    data["useLocation"] = prefs.use_location if prefs else False

    return jsonify(data), 200


@ambiente_bp.route("/preference", methods=["GET"])
@require_auth
def get_user_preference():
    user_id = _get_or_create_user_id()
    prefs = get_or_create_user_preferences(user_id)
    return jsonify(prefs.to_dict()), 200


@ambiente_bp.route("/preference", methods=["PUT", "POST"])
@require_auth
def update_user_preference():
    user_id = _get_or_create_user_id()
    prefs = get_or_create_user_preferences(user_id)
    payload = request.get_json() or {}

    if "use_location" in payload:
        prefs.use_location = bool(payload["use_location"])
    if "city_name" in payload and payload["city_name"]:
        prefs.city_name = str(payload["city_name"]).strip()[:150]
    if "latitude" in payload:
        prefs.latitude = float(payload["latitude"]) if payload["latitude"] is not None else None
    if "longitude" in payload:
        prefs.longitude = float(payload["longitude"]) if payload["longitude"] is not None else None
    if "sync_with_routine" in payload:
        prefs.sync_with_routine = bool(payload["sync_with_routine"])

    try:
        from app.modules.perfil_salud.models import UserProfile
        up = UserProfile.query.filter_by(user_id=user_id).first()
        if up:
            if "use_location" in payload:
                up.use_location = prefs.use_location
            if "city_name" in payload and payload["city_name"]:
                up.manual_city = prefs.city_name
    except Exception:
        pass

    db.session.commit()
    return jsonify({
        "message": "Preferencias ambientales actualizadas exitosamente",
        "preference": prefs.to_dict(),
    }), 200


@ambiente_bp.route("/refresh", methods=["POST"])
@require_auth
def force_refresh_environment():
    user_id = _get_or_create_user_id()
    prefs = get_or_create_user_preferences(user_id) if user_id else None

    payload = request.get_json() or {}
    city = payload.get("city") or (prefs.city_name if prefs else "León, Guanajuato")
    lat = payload.get("lat") or (prefs.latitude if prefs else None)
    lon = payload.get("lon") or (prefs.longitude if prefs else None)

    data = get_environmental_data(
        city_name=city,
        lat=lat,
        lon=lon,
        user_id=user_id,
        force_refresh=True,
    )
    return jsonify(data), 200


@ambiente_bp.route("/cities", methods=["GET"])
def get_available_cities():
    """RF-AMB-02: Búsqueda predictiva de ciudades conforme el usuario escribe."""
    query = request.args.get("q", "").strip()
    if not query:
        cities_list = [
            {"name": name, "label": info["label"], "lat": info["lat"], "lon": info["lon"]}
            for name, info in DEFAULT_CITIES_COORDINATES.items()
        ]
        return jsonify({"cities": cities_list}), 200

    matches = search_cities_predictive(query, limit=6)
    return jsonify({"cities": matches}), 200


@ambiente_bp.route("/routine-context", methods=["GET"])
@require_auth
def get_routine_context_endpoint():
    user_id = _get_or_create_user_id()
    context = get_environmental_routine_context(user_id)
    return jsonify(context), 200