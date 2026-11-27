from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Blueprint, jsonify, request, g
from sqlalchemy import or_, update
from sqlalchemy.orm import selectinload

from app.auth import require_auth
from app.extensions import db
from app.modules.habitos_desafios.models import Challenge, ChallengeDay, Habit, HabitEntry
from app.modules.users.models import User

habitos_desafios_bp = Blueprint('habitos_desafios', __name__, url_prefix='/api/habitos-desafios')
CARE_FOCUS = ('general', 'face', 'hair', 'beard', 'feet')
CHALLENGE_UNITS = ('días', 'sesiones', 'rutinas', 'lavados', 'aplicaciones')
try:
    LOCAL_TIME = ZoneInfo('America/Mexico_City')
except ZoneInfoNotFoundError:
    LOCAL_TIME = timezone(timedelta(hours=-6))


def _get_user():
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        return None
    return user


def _today():
    return datetime.now(LOCAL_TIME).date()


def _habit_progress(habits, today):
    entries = {}
    start = today - timedelta(days=today.weekday())
    if habits:
        rows = HabitEntry.query.filter(HabitEntry.habit_id.in_([habit.id for habit in habits]),
                                       HabitEntry.day.between(start, today)).all()
        for row in rows:
            daily, weekly = entries.get(row.habit_id, (0, 0))
            entries[row.habit_id] = (row.value if row.day == today else daily, weekly + row.value)
    progress = []
    for habit in habits:
        daily, weekly = entries.get(habit.id, (0, 0))
        progress.append({
            **habit.to_dict(),
            'today_value': daily,
            'period_value': weekly if habit.frequency == 'weekly' else daily,
        })
    return progress


def _challenge_progress(challenge, today):
    days = {entry.day for entry in challenge.days}
    return {**challenge.to_dict(), 'days_done': len(days) or (
        challenge.duration_days if challenge.status == 'completed' else 0
    ), 'done_today': today in days}


def _update_challenge_completion(challenge):
    if len(challenge.days) >= challenge.duration_days:
        challenge.status = 'completed'
        challenge.completed_at = challenge.completed_at or datetime.now(timezone.utc)
    else:
        challenge.status = 'active'
        challenge.completed_at = None


def _lock_account(user):
    user_id = user.id
    db.session.rollback()
    db.session.execute(update(User).where(User.id == user_id).values(updated_at=User.updated_at))
    return user_id


def _habit_fields(data):
    if not isinstance(data, dict):
        raise ValueError('Datos del hábito inválidos.')
    fields = {field: data[field] for field in (
        'title', 'description', 'frequency', 'target_value', 'unit', 'focus', 'color', 'active',
    ) if field in data}
    for field, limit, message in (
        ('title', 150, 'Escribe un nombre de hasta 150 caracteres.'),
        ('unit', 50, 'Escribe una unidad de hasta 50 caracteres.'),
    ):
        if field in fields:
            value = fields[field]
            if not isinstance(value, str) or not 1 <= len(value.strip()) <= limit:
                raise ValueError(message)
            fields[field] = value.strip()
    if 'frequency' in fields and fields['frequency'] not in ('daily', 'weekly'):
        raise ValueError('Elige una frecuencia diaria o semanal.')
    if 'target_value' in fields:
        target = fields['target_value']
        if type(target) is not int or not 1 <= target <= 10000:
            raise ValueError('La meta debe ser un número entre 1 y 10000.')
    description = fields.get('description')
    if description is not None and (not isinstance(description, str) or len(description) > 500):
        raise ValueError('La descripción debe tener hasta 500 caracteres.')
    if 'focus' in fields and fields['focus'] not in CARE_FOCUS:
        raise ValueError('Elige un enfoque válido.')
    return fields


@habitos_desafios_bp.route('/habitos', methods=['GET'])
@require_auth
def list_habits():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    habits = Habit.query.filter_by(user_id=user.id, active=True).order_by(Habit.created_at.desc()).all()
    return jsonify({'items': _habit_progress(habits, _today())}), 200


@habitos_desafios_bp.route('/habitos', methods=['POST'])
@require_auth
def create_habit():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        fields = _habit_fields(request.get_json(silent=True))
        if 'title' not in fields:
            raise ValueError('Escribe un nombre de hasta 150 caracteres.')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    habit = Habit(user_id=user.id, **fields)
    db.session.add(habit)
    db.session.commit()
    return jsonify(_habit_progress([habit], _today())[0]), 201


@habitos_desafios_bp.put('/habitos/<habit_id>/progreso')
@require_auth
def record_habit(habit_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    data = request.get_json(silent=True)
    value = data.get('value') if isinstance(data, dict) else None
    if type(value) is not int or not 0 <= value <= 10000:
        return jsonify({'error': 'Ingresa una cantidad válida entre 0 y 10000.'}), 400
    user_id = _lock_account(user)
    habit = Habit.query.filter_by(id=habit_id, user_id=user_id, active=True).with_for_update().first()
    if not habit:
        return jsonify({'error': 'Hábito no encontrado'}), 404
    today = _today()
    entry = db.session.get(HabitEntry, (habit_id, today))
    if value:
        if entry:
            entry.value = value
        else:
            db.session.add(HabitEntry(habit_id=habit_id, day=today, value=value))
    elif entry:
        db.session.delete(entry)
    db.session.commit()
    return jsonify(_habit_progress([habit], today)[0])


@habitos_desafios_bp.route('/habitos/<habit_id>', methods=['PUT'])
@require_auth
def update_habit(habit_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    habit = Habit.query.filter_by(id=habit_id, user_id=user.id).first()
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404

    try:
        fields = _habit_fields(request.get_json(silent=True))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    for field, value in fields.items():
        setattr(habit, field, value)

    db.session.commit()
    return jsonify(_habit_progress([habit], _today())[0]), 200


@habitos_desafios_bp.route('/habitos/<habit_id>', methods=['DELETE'])
@require_auth
def delete_habit(habit_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    habit = Habit.query.filter_by(id=habit_id, user_id=user.id).first()
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404

    habit.active = False
    db.session.commit()
    return jsonify({'message': 'Habit deleted successfully'}), 200


@habitos_desafios_bp.route('/retos', methods=['GET'])
@require_auth
def list_challenges():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    challenges = Challenge.query.options(selectinload(Challenge.days)).filter_by(user_id=user.id).filter(
        or_(Challenge.status != 'archived', Challenge.status.is_(None)),
    ).order_by(Challenge.created_at.desc()).all()
    today = _today()
    return jsonify({'items': [_challenge_progress(challenge, today) for challenge in challenges]}), 200


@habitos_desafios_bp.route('/retos', methods=['POST'])
@require_auth
def create_challenge():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    title = data.get('title') if isinstance(data, dict) else None
    if not isinstance(title, str) or not 1 <= len(title.strip()) <= 150:
        return jsonify({'error': 'Escribe un nombre de hasta 150 caracteres.'}), 400
    duration = data.get('duration_days', 7)
    unit = data.get('unit', 'días')
    focus = data.get('focus', 'general')
    if type(duration) is not int or not 1 <= duration <= 365:
        return jsonify({'error': 'La meta del desafío debe estar entre 1 y 365.'}), 400
    if unit not in CHALLENGE_UNITS or focus not in CARE_FOCUS:
        return jsonify({'error': 'Elige una unidad y un enfoque válidos.'}), 400

    challenge = Challenge(
        user_id=user.id,
        title=title.strip(),
        description=data.get('description'),
        difficulty=data.get('difficulty', 'medium'),
        reward=data.get('reward'),
        status=data.get('status', 'active'),
        duration_days=duration,
        unit=unit,
        focus=focus,
        started_at=data.get('started_at') or datetime.now(timezone.utc),
        completed_at=data.get('completed_at'),
    )
    db.session.add(challenge)
    db.session.commit()
    return jsonify(_challenge_progress(challenge, _today())), 201


@habitos_desafios_bp.put('/retos/<challenge_id>/progreso')
@require_auth
def record_challenge(challenge_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    data = request.get_json(silent=True)
    done = data.get('done') if isinstance(data, dict) else None
    if type(done) is not bool:
        return jsonify({'error': 'Indica si completaste el desafío hoy.'}), 400
    user_id = _lock_account(user)
    challenge = Challenge.query.filter_by(id=challenge_id, user_id=user_id).with_for_update().first()
    if not challenge:
        return jsonify({'error': 'Desafío no encontrado'}), 404
    today = _today()
    entry = db.session.get(ChallengeDay, (challenge_id, today))
    if challenge.status != 'active' and not (challenge.status == 'completed' and entry):
        return jsonify({'error': 'Este desafío ya no admite registros.'}), 409
    if done and not entry:
        challenge.days.append(ChallengeDay(day=today))
    elif not done and entry:
        challenge.days.remove(entry)
    _update_challenge_completion(challenge)
    db.session.commit()
    return jsonify(_challenge_progress(challenge, today))


@habitos_desafios_bp.route('/retos/<challenge_id>', methods=['PUT'])
@require_auth
def update_challenge(challenge_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Datos del desafío inválidos.'}), 400
    if 'title' in data:
        title = data['title']
        if not isinstance(title, str) or not 1 <= len(title.strip()) <= 150:
            return jsonify({'error': 'Escribe un nombre de hasta 150 caracteres.'}), 400
        data['title'] = title.strip()
    description = data.get('description')
    if description is not None and (not isinstance(description, str) or len(description) > 500):
        return jsonify({'error': 'La descripción debe tener hasta 500 caracteres.'}), 400
    if 'duration_days' in data:
        duration = data['duration_days']
        if type(duration) is not int or not 1 <= duration <= 365:
            return jsonify({'error': 'La meta del desafío debe estar entre 1 y 365.'}), 400
    if 'unit' in data and data['unit'] not in CHALLENGE_UNITS:
        return jsonify({'error': 'Elige una unidad válida.'}), 400
    if 'focus' in data and data['focus'] not in CARE_FOCUS:
        return jsonify({'error': 'Elige un enfoque válido.'}), 400
    user_id = _lock_account(user)
    challenge = Challenge.query.filter_by(id=challenge_id, user_id=user_id).with_for_update().first()
    if not challenge or challenge.status == 'archived':
        return jsonify({'error': 'Desafío no encontrado'}), 404
    for field in ['title', 'description', 'difficulty', 'reward', 'status', 'duration_days', 'started_at', 'completed_at', 'unit', 'focus']:
        if field in data:
            setattr(challenge, field, data[field])
    if 'duration_days' in data and 'status' not in data and (
        challenge.status == 'active' or (challenge.status == 'completed' and challenge.days)
    ):
        _update_challenge_completion(challenge)

    db.session.commit()
    return jsonify(_challenge_progress(challenge, _today())), 200


@habitos_desafios_bp.route('/retos/<challenge_id>', methods=['DELETE'])
@require_auth
def delete_challenge(challenge_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    challenge = Challenge.query.filter_by(id=challenge_id, user_id=user.id).first()
    if not challenge:
        return jsonify({'error': 'Challenge not found'}), 404

    challenge.status = 'archived'
    db.session.commit()
    return jsonify({'message': 'Challenge deleted successfully'}), 200
