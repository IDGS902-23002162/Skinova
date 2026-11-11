from flask import Blueprint, jsonify, request, g

from app.auth import require_auth
from app.extensions import db
from app.modules.habitos_desafios.models import Challenge, Habit
from app.modules.users.models import User

habitos_desafios_bp = Blueprint('habitos_desafios', __name__, url_prefix='/api/habitos-desafios')


def _get_user():
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        return None
    return user


@habitos_desafios_bp.route('/habitos', methods=['GET'])
@require_auth
def list_habits():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    habits = Habit.query.filter_by(user_id=user.id, active=True).order_by(Habit.created_at.desc()).all()
    return jsonify({'items': [habit.to_dict() for habit in habits]}), 200


@habitos_desafios_bp.route('/habitos', methods=['POST'])
@require_auth
def create_habit():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400

    habit = Habit(
        user_id=user.id,
        title=title,
        description=data.get('description'),
        frequency=data.get('frequency', 'daily'),
        target_value=data.get('target_value', 1),
        unit=data.get('unit', 'veces'),
        color=data.get('color', '#A9C4B5'),
        active=data.get('active', True),
    )
    db.session.add(habit)
    db.session.commit()
    return jsonify(habit.to_dict()), 201


@habitos_desafios_bp.route('/habitos/<habit_id>', methods=['PUT'])
@require_auth
def update_habit(habit_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    habit = Habit.query.filter_by(id=habit_id, user_id=user.id).first()
    if not habit:
        return jsonify({'error': 'Habit not found'}), 404

    data = request.get_json(silent=True) or {}
    for field in ['title', 'description', 'frequency', 'target_value', 'unit', 'color', 'active']:
        if field in data:
            setattr(habit, field, data[field])

    db.session.commit()
    return jsonify(habit.to_dict()), 200


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

    challenges = Challenge.query.filter_by(user_id=user.id).order_by(Challenge.created_at.desc()).all()
    return jsonify({'items': [challenge.to_dict() for challenge in challenges]}), 200


@habitos_desafios_bp.route('/retos', methods=['POST'])
@require_auth
def create_challenge():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400

    challenge = Challenge(
        user_id=user.id,
        title=title,
        description=data.get('description'),
        difficulty=data.get('difficulty', 'medium'),
        reward=data.get('reward'),
        status=data.get('status', 'active'),
        duration_days=data.get('duration_days', 7),
        started_at=data.get('started_at'),
        completed_at=data.get('completed_at'),
    )
    db.session.add(challenge)
    db.session.commit()
    return jsonify(challenge.to_dict()), 201


@habitos_desafios_bp.route('/retos/<challenge_id>', methods=['PUT'])
@require_auth
def update_challenge(challenge_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    challenge = Challenge.query.filter_by(id=challenge_id, user_id=user.id).first()
    if not challenge:
        return jsonify({'error': 'Challenge not found'}), 404

    data = request.get_json(silent=True) or {}
    for field in ['title', 'description', 'difficulty', 'reward', 'status', 'duration_days', 'started_at', 'completed_at']:
        if field in data:
            setattr(challenge, field, data[field])

    db.session.commit()
    return jsonify(challenge.to_dict()), 200


@habitos_desafios_bp.route('/retos/<challenge_id>', methods=['DELETE'])
@require_auth
def delete_challenge(challenge_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    challenge = Challenge.query.filter_by(id=challenge_id, user_id=user.id).first()
    if not challenge:
        return jsonify({'error': 'Challenge not found'}), 404

    db.session.delete(challenge)
    db.session.commit()
    return jsonify({'message': 'Challenge deleted successfully'}), 200
