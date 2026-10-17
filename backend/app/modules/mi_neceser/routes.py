from flask import Blueprint, jsonify, request, g

from app.auth import require_auth
from app.extensions import db
from app.modules.mi_neceser.models import UserProduct
from app.modules.users.models import User

mi_neceser_bp = Blueprint('mi_neceser', __name__, url_prefix='/api/mi-neceser')


def _get_user():
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        return None
    return user


def _serialize_product(product):
    return {
        'id': product.id,
        'user_id': product.user_id,
        'name': product.name,
        'brand': product.brand,
        'category': product.category,
        'inci': product.inci,
        'opened_at': product.opened_at.isoformat() if product.opened_at else None,
        'expires_at': product.expires_at.isoformat() if product.expires_at else None,
        'quantity_state': product.quantity_state,
        'active': product.active,
        'paused_until': product.paused_until.isoformat() if product.paused_until else None,
        'notes': product.notes,
        'created_at': product.created_at.isoformat() if product.created_at else None,
        'updated_at': product.updated_at.isoformat() if product.updated_at else None,
    }


@mi_neceser_bp.route('/productos', methods=['GET'])
@require_auth
def list_products():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    products = UserProduct.query.filter_by(user_id=user.id, active=True).order_by(UserProduct.created_at.desc()).all()
    return jsonify({'items': [_serialize_product(product) for product in products]}), 200


@mi_neceser_bp.route('/productos', methods=['POST'])
@require_auth
def create_product():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400

    product = UserProduct(
        user_id=user.id,
        name=name,
        brand=data.get('brand'),
        category=data.get('category'),
        inci=data.get('inci'),
        opened_at=data.get('opened_at'),
        expires_at=data.get('expires_at'),
        quantity_state=data.get('quantity_state', 'new'),
        active=data.get('active', True),
        paused_until=data.get('paused_until'),
        notes=data.get('notes'),
    )

    db.session.add(product)
    db.session.commit()

    return jsonify(_serialize_product(product)), 201


@mi_neceser_bp.route('/productos/<product_id>', methods=['PUT'])
@require_auth
def update_product(product_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    product = UserProduct.query.filter_by(id=product_id, user_id=user.id).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    data = request.get_json(silent=True) or {}
    for field in ['name', 'brand', 'category', 'inci', 'opened_at', 'expires_at', 'quantity_state', 'active', 'paused_until', 'notes']:
        if field in data:
            setattr(product, field, data[field])

    db.session.commit()
    return jsonify(_serialize_product(product)), 200


@mi_neceser_bp.route('/productos/<product_id>', methods=['DELETE'])
@require_auth
def delete_product(product_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    product = UserProduct.query.filter_by(id=product_id, user_id=user.id).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    product.active = False
    db.session.commit()
    return jsonify({'message': 'Product deleted successfully'}), 200
