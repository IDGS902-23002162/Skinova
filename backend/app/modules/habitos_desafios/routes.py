from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, g
from sqlalchemy import or_, update

from app.auth import require_auth
from app.extensions import db
from app.modules.habitos_desafios.cycles import (
    LOCAL_TIME, completion_timestamp, cycle_plan, cycle_progress,
    initialize_cycle, set_tracking_stopped, update_cycle,
)
from app.modules.habitos_desafios.models import Challenge, ChallengeDay, Habit, HabitEntry
from app.modules.mi_neceser.models import UserProduct
from app.modules.users.models import User

habitos_desafios_bp = Blueprint('habitos_desafios', __name__, url_prefix='/api/habitos-desafios')
CARE_FOCUS = ('general', 'face', 'hair', 'beard', 'feet')
CHALLENGE_UNITS = ('días', 'sesiones', 'rutinas', 'lavados', 'aplicaciones')


def _get_user():
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        return None
    return user


def _today():
    return datetime.now(LOCAL_TIME).date()


def _progress_entries(items, is_habit):
    entries = {item.id: {} for item in items}
    if not entries:
        return entries
    if is_habit:
        rows = db.session.query(HabitEntry.habit_id, HabitEntry.day, HabitEntry.value).filter(
            HabitEntry.habit_id.in_(entries),
        )
        for item_id, day, value in rows:
            entries[item_id][day] = value
    else:
        rows = db.session.query(ChallengeDay.challenge_id, ChallengeDay.day).filter(
            ChallengeDay.challenge_id.in_(entries),
        )
        for item_id, day in rows:
            entries[item_id][day] = 1
    return entries


def _serialize_progress(item, state):
    result = {**item.to_dict(), **{field: state[field] for field in ('period', 'history', 'failed_count')}}
    period = state['period']
    value = period['value'] if period else 0
    if isinstance(item, Habit):
        result.update(today_value=state['today_value'], period_value=value)
    else:
        if item.status in (None, 'active', 'completed'):
            result['status'] = period['status'] if period else 'active'
        result.update(days_done=value, done_today=state['today_value'] > 0,
                      completed_at=completion_timestamp(period))
    return result


def _progress(items, today, is_habit):
    entries = _progress_entries(items, is_habit)
    return [_serialize_progress(item, cycle_progress(item, today, entries[item.id])) for item in items]


def _current_state(item, today):
    entries = _progress_entries([item], isinstance(item, Habit))[item.id]
    return cycle_progress(item, today, entries), entries


def _check_period(data, period):
    return period and ('period_start' not in data or data['period_start'] == period['start'])


def _lock_account(user):
    user_id = user.id
    db.session.rollback()
    db.session.execute(update(User).where(User.id == user_id).values(updated_at=User.updated_at))
    return user_id


def _neceser_fields(data, user_id):
    if 'product_ids' not in data:
        return {}
    ids = data['product_ids']
    if not isinstance(ids, list) or any(not isinstance(value, str) or len(value) != 36 for value in ids):
        raise ValueError('Selecciona productos válidos de tu neceser.')
    ids = list(dict.fromkeys(ids))
    if ids:
        rows = db.session.query(UserProduct.id).filter_by(user_id=user_id, active=True).filter(
            UserProduct.id.in_(ids),
        ).all()
        if len(rows) != len(ids):
            raise ValueError('Uno de los productos seleccionados ya no está en tu neceser.')
    return {'product_ids': ids}


def _habit_fields(data, user_id):
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
    return {**fields, **_neceser_fields(data, user_id)}


@habitos_desafios_bp.route('/habitos', methods=['GET'])
@require_auth
def list_habits():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    habits = Habit.query.filter_by(user_id=user.id, active=True).order_by(Habit.created_at.desc()).all()
    return jsonify({'items': _progress(habits, _today(), True)}), 200


@habitos_desafios_bp.route('/habitos', methods=['POST'])
@require_auth
def create_habit():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        fields = _habit_fields(request.get_json(silent=True), user.id)
        if 'title' not in fields:
            raise ValueError('Escribe un nombre de hasta 150 caracteres.')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    habit = Habit(user_id=user.id, **fields)
    today = _today()
    initialize_cycle(habit, today)
    db.session.add(habit)
    db.session.commit()
    return jsonify(_progress([habit], today, True)[0]), 201


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
    state, entries = _current_state(habit, today)
    period = state['period']
    if not _check_period(data, period):
        return jsonify({'error': 'Ya comenzó otro periodo. Actualiza tu progreso e inténtalo de nuevo.'}), 409
    today_raw = entries.get(today, 0)
    remaining = max(0, period['target'] - (state['raw_total'] - today_raw))
    if value > remaining:
        return jsonify({'error': 'El progreso no puede superar la meta del periodo.'}), 422
    entry = db.session.get(HabitEntry, (habit_id, today))
    if value:
        if entry:
            entry.value = value
        else:
            db.session.add(HabitEntry(habit_id=habit_id, day=today, value=value))
        entries[today] = value
    elif entry:
        db.session.delete(entry)
        entries.pop(today, None)
    db.session.commit()
    return jsonify(_serialize_progress(habit, cycle_progress(habit, today, entries)))


@habitos_desafios_bp.route('/habitos/<habit_id>', methods=['PUT'])
@require_auth
def update_habit(habit_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_id = _lock_account(user)
    habit = Habit.query.filter_by(id=habit_id, user_id=user_id).with_for_update().first()
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404

    try:
        fields = _habit_fields(request.get_json(silent=True), user_id)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    today = _today()
    if fields.get('active') is True and not habit.active:
        set_tracking_stopped(habit, today, False)
    state, _ = _current_state(habit, today)
    plan = cycle_plan(habit)
    for field, value in fields.items():
        setattr(habit, field, value)
    update_cycle(habit, plan, state['period'], today)
    if 'active' in fields and not habit.active:
        set_tracking_stopped(habit, today, True)
    db.session.commit()
    return jsonify(_progress([habit], today, True)[0]), 200


@habitos_desafios_bp.route('/habitos/<habit_id>', methods=['DELETE'])
@require_auth
def delete_habit(habit_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_id = _lock_account(user)
    habit = Habit.query.filter_by(id=habit_id, user_id=user_id).with_for_update().first()
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404

    set_tracking_stopped(habit, _today(), True)
    habit.active = False
    db.session.commit()
    return jsonify({'message': 'Habit deleted successfully'}), 200


@habitos_desafios_bp.route('/retos', methods=['GET'])
@require_auth
def list_challenges():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    challenges = Challenge.query.filter_by(user_id=user.id).filter(
        or_(Challenge.status != 'archived', Challenge.status.is_(None)),
    ).order_by(Challenge.created_at.desc()).all()
    today = _today()
    return jsonify({'items': _progress(challenges, today, False)}), 200


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
    try:
        product_fields = _neceser_fields(data, user.id)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

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
        **product_fields,
    )
    today = _today()
    initialize_cycle(challenge, today)
    if challenge.status == 'archived':
        set_tracking_stopped(challenge, today, True)
    db.session.add(challenge)
    db.session.commit()
    return jsonify(_progress([challenge], today, False)[0]), 201


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
    if challenge.status not in (None, 'active', 'completed'):
        return jsonify({'error': 'Este desafío ya no admite registros.'}), 409
    state, entries = _current_state(challenge, today)
    period = state['period']
    if not _check_period(data, period):
        return jsonify({'error': 'Ya comenzó otro periodo. Actualiza tu progreso e inténtalo de nuevo.'}), 409
    entry = db.session.get(ChallengeDay, (challenge_id, today))
    if done and not entry:
        if state['raw_total'] >= period['target']:
            return jsonify({'error': 'El progreso no puede superar la meta del periodo.'}), 422
        db.session.add(ChallengeDay(challenge_id=challenge_id, day=today))
        entries[today] = 1
    elif not done and entry:
        db.session.delete(entry)
        entries.pop(today, None)
    db.session.commit()
    return jsonify(_serialize_progress(challenge, cycle_progress(challenge, today, entries)))


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
    try:
        product_fields = _neceser_fields(data, user_id)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    today = _today()
    state, _ = _current_state(challenge, today)
    plan = cycle_plan(challenge)
    if 'product_ids' in product_fields:
        challenge.product_ids = product_fields['product_ids']
    for field in ['title', 'description', 'difficulty', 'reward', 'status', 'duration_days', 'started_at', 'completed_at', 'unit', 'focus']:
        if field in data:
            setattr(challenge, field, data[field])
    update_cycle(challenge, plan, state['period'], today)
    if challenge.status == 'archived':
        set_tracking_stopped(challenge, today, True)
    db.session.commit()
    return jsonify(_progress([challenge], today, False)[0]), 200


@habitos_desafios_bp.route('/retos/<challenge_id>', methods=['DELETE'])
@require_auth
def delete_challenge(challenge_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_id = _lock_account(user)
    challenge = Challenge.query.filter_by(id=challenge_id, user_id=user_id).with_for_update().first()
    if not challenge:
        return jsonify({'error': 'Challenge not found'}), 404

    set_tracking_stopped(challenge, _today(), True)
    challenge.status = 'archived'
    db.session.commit()
    return jsonify({'message': 'Challenge deleted successfully'}), 200


@habitos_desafios_bp.get('/historial/retirados')
@require_auth
def archived_progress():
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    kind = request.args.get('tipo')
    if kind == 'habitos':
        items = Habit.query.filter_by(user_id=user.id, active=False).order_by(Habit.updated_at.desc()).all()
    elif kind == 'retos':
        items = Challenge.query.filter_by(user_id=user.id, status='archived').order_by(Challenge.updated_at.desc()).all()
    else:
        return jsonify({'error': 'Tipo de historial inválido.'}), 400
    return jsonify({'items': _progress(items, _today(), kind == 'habitos')})
