import logging
from datetime import datetime, date
from flask import Blueprint, request, jsonify, g
from app.auth import require_auth
from app.extensions import db
from app.modules.users.models import User
from app.modules.perfil_salud.models import UserProfile
from app.modules.bitacora.services import BitacoraService
from app.modules.face_id.service import FaceIdService

logger = logging.getLogger(__name__)

bitacora_bp = Blueprint('bitacora', __name__, url_prefix='/api/bitacora')

def _get_authenticated_user_id() -> str:
    """Obtiene el ID interno del usuario a partir del clerk_user_id de g."""
    clerk_user_id = getattr(g, 'user_id', None)
    if not clerk_user_id:
        raise PermissionError("Usuario no autenticado en Clerk.")

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

    if not user:
        raise RuntimeError("No se pudo obtener el usuario.")

    return user.id


# =============================================================================
# Rutas de Bitácora de Progreso y Hábitos
# =============================================================================
@bitacora_bp.route('/entries', methods=['GET'])
@require_auth
def get_entries():
    """Obtiene los registros de la bitácora del usuario."""
    try:
        user_id = _get_authenticated_user_id()
        limit = min(int(request.args.get('limit', 50)), 100)
        items = BitacoraService.get_timeline(user_id, limit=limit)
        return jsonify({"success": True, "data": items}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/entries', methods=['POST'])
@require_auth
def create_entry():
    """Crea una entrada en la bitácora con percepción, fotos y notas tras validar facialmente las fotos."""
    try:
        user_id = _get_authenticated_user_id()
        clerk_user_id = getattr(g, 'user_id', None)
        data = request.get_json() or {}
        perception = data.get("perception", "same")
        notes = data.get("notes")
        routine_id = data.get("routine_id")
        photos = data.get("photos", [])

        # Validación con Face ID antes de persistir la foto o entrada en la base de datos
        if photos:
            photo_list = photos if isinstance(photos, list) else [photos]
            for photo in photo_list:
                if photo and isinstance(photo, str) and (photo.startswith("data:image") or len(photo) > 100):
                    verification = FaceIdService.verify_user_photo(
                        clerk_user_id=clerk_user_id,
                        submitted_image=photo
                    )
                    if not verification.verified:
                        logger.warning(
                            f"Bitácora photo submission rejected for user {clerk_user_id}: "
                            f"{verification.error_code} - {verification.message}"
                        )
                        return jsonify({
                            "success": False,
                            "error": verification.message,
                            "message": verification.message,
                            "error_code": verification.error_code,
                            "similarity_score": verification.similarity_score,
                            "threshold": verification.threshold
                        }), 400

        entry = BitacoraService.create_progress_entry(
            user_id=user_id,
            perception=perception,
            notes=notes,
            routine_id=routine_id,
            photo_storage_keys=photos
        )
        return jsonify({"success": True, "data": entry.to_dict()}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/entries/<entry_id>', methods=['DELETE'])
@require_auth
def delete_entry(entry_id):
    """Elimina una entrada de la bitácora."""
    try:
        user_id = _get_authenticated_user_id()
        success = BitacoraService.delete_entry(entry_id=entry_id, user_id=user_id)
        if not success:
            return jsonify({"error": "Registro no encontrado"}), 404
        return jsonify({"success": True, "message": "Registro eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/photos/<photo_id>', methods=['DELETE'])
@require_auth
def delete_photo(photo_id):
    """Elimina una fotografía de progreso."""
    try:
        user_id = _get_authenticated_user_id()
        success = BitacoraService.delete_photo(photo_id=photo_id, user_id=user_id)
        if not success:
            return jsonify({"error": "Foto no encontrada"}), 404
        return jsonify({"success": True, "message": "Foto eliminada"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/routines', methods=['GET'])
@require_auth
def get_routines():
    """Obtiene las rutinas activas del usuario para asociar a los registros."""
    try:
        user_id = _get_authenticated_user_id()
        routines = BitacoraService.get_user_routines(user_id=user_id)
        return jsonify({"success": True, "data": routines}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/habits', methods=['GET'])
@require_auth
def get_daily_habits():
    """Obtiene el registro de hábitos para una fecha específica o el día de hoy."""
    try:
        user_id = _get_authenticated_user_id()
        log_date_str = request.args.get("log_date")
        target_date = datetime.strptime(log_date_str, "%Y-%m-%d").date() if log_date_str else date.today()
        from app.modules.bitacora.models import HabitLog
        habit = HabitLog.query.filter_by(user_id=user_id, log_date=target_date).first()
        return jsonify({"success": True, "data": habit.to_dict() if habit else None}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/habits', methods=['POST'])
@require_auth
def log_daily_habits():
    """Registra los hábitos del día (agua, sueño, estrés, etc.)."""
    try:
        user_id = _get_authenticated_user_id()
        data = request.get_json() or {}
        log_date_str = data.get("log_date")
        target_date = datetime.strptime(log_date_str, "%Y-%m-%d").date() if log_date_str else date.today()

        habit = BitacoraService.log_habits(
            user_id=user_id,
            log_date=target_date,
            water_ml=data.get("water_ml"),
            sleep_hours=data.get("sleep_hours"),
            stress_level=data.get("stress_level"),
            activity_minutes=data.get("activity_minutes"),
            menstrual_cycle_info=data.get("menstrual_cycle_info"),
            notes=data.get("notes")
        )
        return jsonify({"success": True, "data": habit.to_dict()}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# Rutas de Notificaciones y Alarmas (RF-NOT-01 a RF-NOT-15)
# =============================================================================
@bitacora_bp.route('/notifications', methods=['GET'])
@require_auth
def get_bitacora_notifications():
    """Historial de notificaciones dentro de la bitácora (RF-NOT-14)."""
    try:
        user_id = _get_authenticated_user_id()
        category = request.args.get('category')
        group = request.args.get('group')
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = max(int(request.args.get('offset', 0)), 0)

        result = BitacoraService.get_user_notifications(
            user_id=user_id,
            category=category,
            group=group,
            unread_only=unread_only,
            limit=limit,
            offset=offset
        )
        return jsonify({
            "success": True,
            "data": result["items"],
            "total": result["total"],
            "unread_count": result["unread_count"]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/notifications/check', methods=['POST'])
@require_auth
def check_reminders():
    """Evalúa automáticamente todos los recordatorios para el usuario (RF-NOT-01 a 10)."""
    try:
        user_id = _get_authenticated_user_id()
        generated = BitacoraService.evaluate_all_reminders_for_user(user_id)
        return jsonify({
            "success": True,
            "generated_count": len(generated),
            "data": [n.to_dict() for n in generated]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/notifications/settings', methods=['GET'])
@require_auth
def get_settings():
    """Obtiene la configuración de notificaciones (RF-NOT-11, 12, 13)."""
    try:
        user_id = _get_authenticated_user_id()
        settings = BitacoraService.get_user_settings(user_id)
        return jsonify({"success": True, "data": settings}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bitacora_bp.route('/notifications/settings', methods=['PUT'])
@require_auth
def update_settings():
    """Actualiza la configuración de notificaciones (RF-NOT-11, 12, 13)."""
    try:
        user_id = _get_authenticated_user_id()
        payload = request.get_json() or {}
        settings = BitacoraService.update_user_settings(user_id, payload)
        return jsonify({"success": True, "data": settings}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
