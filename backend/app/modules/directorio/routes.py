import uuid
from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.extensions import db
from app.modules.users.models import User
from app.modules.directorio.models import Dermatologist, FavoriteDermatologist
from app.modules.directorio.services import (
    search_dermatologists,
    toggle_dermatologist_favorite,
    get_user_favorite_ids,
    get_ai_referral_status,
    ensure_dermatologists_seeded,
)

directorio_bp = Blueprint("directorio_dermatologos", __name__, url_prefix="/api/directorio")


def _get_current_user_id():
    """Obtiene el ID interno del usuario si está autenticado con Clerk."""
    if not hasattr(g, "user_id") or not g.user_id:
        return None
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        user = User(id=str(uuid.uuid4()), clerk_user_id=g.user_id, role="user")
        db.session.add(user)
        db.session.commit()
    return user.id


@directorio_bp.route("/specialists", methods=["GET"])
def get_specialists():
    """
    RF-DER-01 al RF-DER-07:
    Lista y filtra especialistas dermatológicos según proximidad geográfica,
    tipo de atención (presencial, en línea, ambos), texto de búsqueda y favoritos.
    """
    user_id = _get_current_user_id()

    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    query = request.args.get("q", "").strip()
    max_dist = request.args.get("max_distance", 50.0, type=float)
    care_type = request.args.get("care_type", "todos").strip().lower()
    only_favs = request.args.get("only_favorites", "false").lower() in ("true", "1")

    specialists = search_dermatologists(
        user_lat=lat,
        user_lon=lon,
        query=query,
        max_distance_km=max_dist,
        care_type=care_type,
        only_favorites=only_favs,
        user_id=user_id
    )

    return jsonify({
        "total": len(specialists),
        "specialists": specialists
    }), 200


@directorio_bp.route("/specialists/<doctor_id>", methods=["GET"])
def get_specialist_detail(doctor_id):
    """RF-DER-05: Devuelve la información pública completa de un especialista."""
    ensure_dermatologists_seeded()
    user_id = _get_current_user_id()
    doc = db.session.get(Dermatologist, doctor_id)
    if not doc:
        return jsonify({"error": "Especialista no encontrado"}), 404

    fav_ids = set(get_user_favorite_ids(user_id)) if user_id else set()
    return jsonify(doc.to_dict(is_favorite=doc.id in fav_ids)), 200


@directorio_bp.route("/favorites", methods=["GET"])
@require_auth
def get_favorites():
    """RF-DER-11: Obtiene la lista de IDs y datos de dermatólogos favoritos del usuario."""
    user_id = _get_current_user_id()
    fav_ids = get_user_favorite_ids(user_id)
    fav_records = FavoriteDermatologist.query.filter_by(user_id=user_id).all()

    return jsonify({
        "favoriteIds": fav_ids,
        "favorites": [f.to_dict() for f in fav_records]
    }), 200


@directorio_bp.route("/favorites/<doctor_id>", methods=["POST"])
@require_auth
def toggle_favorite(doctor_id):
    """RF-DER-11: Alterna un especialista como favorito (agregar/eliminar)."""
    user_id = _get_current_user_id()
    result = toggle_dermatologist_favorite(user_id, doctor_id)
    return jsonify(result), 200


@directorio_bp.route("/favorites/<doctor_id>", methods=["DELETE"])
@require_auth
def remove_favorite(doctor_id):
    """RF-DER-11: Elimina explícitamente un especialista de favoritos."""
    user_id = _get_current_user_id()
    fav = FavoriteDermatologist.query.filter_by(user_id=user_id, external_id=doctor_id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
    return jsonify({"doctorId": doctor_id, "isFavorite": False}), 200


@directorio_bp.route("/ai-referral", methods=["GET"])
@require_auth
def get_ai_referral():
    """
    RF-DER-12, RNF-17, RNF-18:
    Comprueba si los análisis de piel o consultas con IA del usuario han detectado
    situaciones que requieran consulta con un profesional dermatológico.
    """
    user_id = _get_current_user_id()
    referral_info = get_ai_referral_status(user_id)
    return jsonify(referral_info), 200
