import base64
import re
import unicodedata
from hashlib import sha256
from itertools import chain
from io import BytesIO

from flask import Blueprint, current_app, jsonify, request, g
from sqlalchemy import or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import defer
from werkzeug.datastructures import FileStorage

from app.auth import require_auth
from app.extensions import db
from app.modules.mi_neceser.models import CatalogProduct, UserProduct
from app.modules.mi_neceser.photo_product import GeminiUnavailable, LABEL_FIELDS, MAX_PHOTO_BYTES, analyze_photos, prepare_photo
from app.modules.users.models import User

mi_neceser_bp = Blueprint('mi_neceser', __name__, url_prefix='/api/mi-neceser')


def _get_user():
    user = User.query.filter_by(clerk_user_id=g.user_id).first()
    if not user:
        return None
    return user


def _serialize_product(product):
    shared = product.shared_product
    details = _serialize_catalog(shared) if shared else {
        'name': product.name_es or product.name,
        'brand': product.brand,
        'category': product.category,
        'inci': product.inci,
        'ingredients_es': product.ingredients_es,
        'image_url': _photo_url(product.photo),
        'back_image_url': _photo_url(product.back_photo),
        'has_personal_photo': bool(product.photo),
        'side_effects': product.side_effects,
        'warnings': product.warnings,
        'label_verification': product.label_verification,
        'purchase_links': product.purchase_links or [],
        'purchase_search_unavailable': bool(product.photo) and product.purchase_links is None,
        'quantity': product.quantity,
        'catalog_code': product.catalog_code,
    }
    return {
        **details,
        'id': product.id,
        'user_id': product.user_id,
        'opened_at': product.opened_at.isoformat() if product.opened_at else None,
        'expires_at': product.expires_at.isoformat() if product.expires_at else None,
        'quantity_state': product.quantity_state,
        'active': product.active,
        'paused_until': product.paused_until.isoformat() if product.paused_until else None,
        'notes': product.notes,
        'routine': product.routine,
        'created_at': product.created_at.isoformat() if product.created_at else None,
        'updated_at': product.updated_at.isoformat() if product.updated_at else None,
    }


def _photo_url(photo):
    return 'data:image/webp;base64,' + base64.b64encode(photo).decode('ascii') if photo else None


def _photo_enrichment(target, details):
    previous = target.details if isinstance(target, CatalogProduct) else {
        field: getattr(target, field) for field in LABEL_FIELDS
    }
    enriched = {field: details[field] for field in (*LABEL_FIELDS, 'label_verification') if details.get(field)}
    if enriched.get('inci') and enriched['inci'] != previous.get('inci') and 'ingredients_es' not in enriched:
        enriched['ingredients_es'] = None
    if isinstance(target, CatalogProduct):
        return {'details': {**previous, **enriched}}
    return enriched


def _matches_photo_details(target, details):
    barcode = target.barcode if isinstance(target, CatalogProduct) else target.catalog_code
    if barcode and details.get('barcode'):
        return barcode.zfill(14) == details['barcode'].zfill(14)
    original = target.details if isinstance(target, CatalogProduct) else {
        'brand': target.brand, 'name': target.name, 'name_es': target.name_es, 'quantity': target.quantity,
    }
    brand = _normalize(original.get('brand'))
    if not brand or brand != _normalize(details.get('brand')):
        return False
    def names(values):
        return {_normalize(values[field]).removeprefix(brand + ' ')
                for field in ('name', 'name_es') if values.get(field)}

    original_quantity = _normalize(original.get('quantity')).replace(' ', '')
    candidate_quantity = _normalize(details.get('quantity')).replace(' ', '')
    if original_quantity and candidate_quantity and original_quantity != candidate_quantity:
        return False
    return bool(names(original) & names(details))


def _serialize_catalog(product):
    details = product.details
    return {
        **details,
        'name': details.get('name_es') or details['name'],
        'catalog_id': product.id,
        'catalog_code': product.barcode,
        'image_url': _photo_url(product.photo),
        'back_image_url': _photo_url(product.back_photo),
        'has_personal_photo': True,
        'purchase_links': details.get('purchase_links') or [],
        'purchase_search_unavailable': details.get('purchase_links') is None,
    }


SEARCH_FIELDS = {
    'product': ('name', 'name_es', 'brand', 'category'),
    'brand': ('brand',),
    'ingredient': ('inci', 'ingredients_es'),
    'purpose': ('category', 'name', 'name_es', 'scope'),
}
SCOPE_NAMES = {'skin': 'piel', 'beard': 'barba', 'hair': 'cabello capilar', 'hand': 'manos', 'foot': 'pies', 'nail': 'uñas'}
SEARCH_ALIASES = {'champu': ('champu', 'shampoo'), 'cabello': ('cabello', 'capilar', 'cabelludo')}
PAGE_SIZE = 12


@mi_neceser_bp.get('/catalogo')
@require_auth
def search_catalog():
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    query = request.args.get('q', '').strip()
    terms = _normalize(query).split()
    mode = request.args.get('mode', 'product')
    page = request.args.get('page', 1, type=int)
    if not terms or not 2 <= len(query) <= 80 or mode not in SEARCH_FIELDS or not 1 <= page <= 100:
        return jsonify({'error': 'Búsqueda inválida'}), 400

    start = (page - 1) * PAGE_SIZE
    hits = []
    matches = 0
    shared = db.session.query(CatalogProduct.id, CatalogProduct.details).order_by(CatalogProduct.id).yield_per(100)
    rows = chain(((product_id, details, False) for product_id, details in shared), _legacy_search_rows(user.id))
    for product_id, details, personal in rows:
        fields = [details.get(field) for field in SEARCH_FIELDS[mode]]
        if mode in ('product', 'purpose'):
            fields.append(SCOPE_NAMES.get(details.get('scope')))
        text = _normalize(' '.join(value for value in fields if value))
        if all(any(alias in text for alias in SEARCH_ALIASES.get(term, (term,))) for term in terms):
            if matches >= start:
                hits.append((product_id, personal))
            matches += 1
            if len(hits) > PAGE_SIZE:
                break
    shared_ids = [product_id for product_id, personal in hits[:PAGE_SIZE] if not personal]
    personal_ids = [product_id for product_id, personal in hits[:PAGE_SIZE] if personal]
    records = {record.id: _serialize_catalog(record) for record in
               CatalogProduct.query.filter(CatalogProduct.id.in_(shared_ids)).all()} if shared_ids else {}
    if personal_ids:
        records.update({record.id: _serialize_product(record) for record in
                        UserProduct.query.filter_by(user_id=user.id).filter(UserProduct.id.in_(personal_ids)).all()})
    return jsonify({'items': [records[product_id] for product_id, _ in hits[:PAGE_SIZE] if product_id in records],
                    'page': page, 'has_more': len(hits) > PAGE_SIZE})


def _legacy_search_rows(user_id):
    # Previously submitted photos stay private until their owner submits them to the shared catalog.
    fields = ('name', 'name_es', 'brand', 'category', 'inci', 'ingredients_es')
    rows = db.session.query(UserProduct.id, *(getattr(UserProduct, field) for field in fields)).filter(
        UserProduct.user_id == user_id, UserProduct.active.is_(True),
        UserProduct.shared_product_id.is_(None), UserProduct.photo.is_not(None),
    ).order_by(UserProduct.id).yield_per(100)
    for product_id, *values in rows:
        details = dict(zip(fields, values))
        category = _normalize(details['category'])
        if re.search(r'\b(?:piel|facial|solar|barba|cabello|capilar|cuero cabelludo|manos|pies|unas|cuticulas)\b', category):
            yield product_id, details, True


def _normalize(value):
    text = unicodedata.normalize('NFKD', (value or '').casefold())
    return ' '.join(re.findall(r'[a-z0-9]+', ''.join(c for c in text if not unicodedata.combining(c))))


def _find_saved_product(user_id, name, brand, code=None, quantity=None, name_es=None, *, lock=True):
    # Serialize additions per account, including the check against products saved before photos.
    if lock:
        db.session.execute(update(User).where(User.id == user_id).values(updated_at=User.updated_at))
    normalized_brand = _normalize(brand)
    names = {_normalize(value).removeprefix(normalized_brand + ' ') for value in (name, name_es) if value}
    normalized_quantity = _normalize(quantity).replace(' ', '')
    products = UserProduct.query.filter_by(user_id=user_id, shared_product_id=None).order_by(
        UserProduct.active.desc()
    )
    if lock:
        products = products.with_for_update()
    for product in products:
        if code and product.catalog_code and code.zfill(14) == product.catalog_code.zfill(14):
            return product
        saved_brand = _normalize(product.brand)
        saved_names = {_normalize(value).removeprefix(saved_brand + ' ')
                       for value in (product.name, product.name_es) if value}
        saved_quantity = _normalize(product.quantity).replace(' ', '')
        if saved_brand == normalized_brand and names.intersection(saved_names) and (
            not saved_quantity or not normalized_quantity or saved_quantity == normalized_quantity
        ):
            return product
    return None


def _catalog_identity(details):
    brand = _normalize(details['brand'])
    name = _normalize(details['name']).removeprefix(brand + ' ')
    quantity = _normalize(details.get('quantity')).replace(' ', '')
    barcode = (details.get('barcode') or '').zfill(14)
    return sha256(f'{brand}|{name}|{quantity}|{barcode}'.encode()).hexdigest()


def _catalog_match(details, photo_hash):
    barcode = details.get('barcode')
    query = CatalogProduct.query.filter(or_(
        CatalogProduct.photo_hash == photo_hash,
        CatalogProduct.identity == _catalog_identity(details),
        CatalogProduct.barcode == barcode.zfill(14) if barcode else False,
    ))
    match = query.first()
    if match:
        return match
    # Cross-language labels and photos without a visible size can share a ficha.
    brand = _normalize(details['brand'])
    names = {_normalize(details.get(field)).removeprefix(brand + ' ')
             for field in ('name', 'name_es') if details.get(field)}
    quantity = _normalize(details.get('quantity')).replace(' ', '')
    for candidate in CatalogProduct.query.options(defer(CatalogProduct.photo)).yield_per(100):
        saved = candidate.details
        if _normalize(saved.get('brand')) != brand:
            continue
        if barcode and candidate.barcode and barcode.zfill(14) != candidate.barcode:
            continue
        saved_names = {_normalize(saved.get(field)).removeprefix(brand + ' ')
                       for field in ('name', 'name_es') if saved.get(field)}
        saved_quantity = _normalize(saved.get('quantity')).replace(' ', '')
        if names.intersection(saved_names) and (not quantity or not saved_quantity or quantity == saved_quantity):
            return candidate
    return None


def _uploaded_photos():
    if request.content_length and request.content_length > 2 * MAX_PHOTO_BYTES + 65536:
        raise ValueError('Cada foto debe pesar como máximo 8 MB.')
    front = request.files.get('front')
    if not front:
        raise ValueError('Sube una foto del frente del producto.')
    front_image, preview = prepare_photo(front)
    back = request.files.get('back')
    photos = [front_image]
    back_preview = None
    if back:
        back_image, back_preview = prepare_photo(back, preview_size=1600)
        photos.append(back_image)
    return photos, preview, sha256(preview).hexdigest(), back_preview


def _link_product(user_id, shared, routine):
    details = shared.details
    existing = _find_saved_product(user_id, details['name'], details['brand'], shared.barcode,
                                   details.get('quantity'), details.get('name_es'))
    linked = UserProduct.query.filter_by(user_id=user_id, shared_product_id=shared.id).with_for_update().first()
    product = linked or existing or UserProduct(user_id=user_id, name=details['name'], brand=details['brand'])
    if product.active and product.shared_product_id:
        db.session.rollback()
        return jsonify({'error': 'Este producto ya está en tu neceser'}), 409
    product.shared_product = shared
    product.catalog_code = shared.barcode
    product.routine = details['routine'] if routine == 'auto' else routine
    product.active = True
    product.quantity_state = product.quantity_state or 'new'
    db.session.add(product)
    db.session.commit()
    return jsonify(_serialize_product(product)), 201


@mi_neceser_bp.post('/catalogo/foto')
@require_auth
def search_catalog_photo():
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    user_id = user.id
    db.session.rollback()
    try:
        photos, _, photo_hash, _ = _uploaded_photos()
        details = analyze_photos(photos, identify_only=True)
        match = _catalog_match(details, photo_hash)
        if not match:
            personal = _find_saved_product(user_id, details['name'], details['brand'], details.get('barcode'),
                                           details.get('quantity'), details.get('name_es'), lock=False)
            if personal and personal.active and personal.photo:
                return jsonify({'items': [_serialize_product(personal)]})
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 422
    except GeminiUnavailable as exc:
        return jsonify({'error': str(exc)}), 503
    return jsonify({'items': [_serialize_catalog(match)] if match else []})


@mi_neceser_bp.post('/productos/foto')
@require_auth
def add_photo_product():
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    user_id = user.id
    db.session.rollback()
    routine = request.form.get('routine', 'auto')
    if routine not in ('auto', 'morning', 'evening', 'both'):
        return jsonify({'error': 'Rutina inválida'}), 400
    try:
        photos, preview, photo_hash, back_preview = _uploaded_photos()
        if request.form.get('own_photo') != 'yes':
            return jsonify({'error': 'Confirma que las fotos fueron tomadas por ti.'}), 400
        db.session.rollback()
        identity = analyze_photos(photos, identify_only=True)
        shared = _catalog_match(identity, photo_hash)
        if shared:
            return _link_product(user_id, shared, routine)
        db.session.rollback()
        details = analyze_photos(photos)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 422
    except GeminiUnavailable as exc:
        current_app.logger.warning('Gemini product analysis unavailable: %s', exc)
        return jsonify({'error': str(exc)}), 503

    shared = _catalog_match(details, photo_hash)
    if not shared:
        barcode = details.get('barcode')
        shared = CatalogProduct(identity=_catalog_identity(details), barcode=barcode.zfill(14) if barcode else None,
                                photo_hash=photo_hash, photo=preview, back_photo=back_preview,
                                details={key: value for key, value in details.items() if key != 'barcode'})
        try:
            db.session.execute(update(User).where(User.id == user_id).values(updated_at=User.updated_at))
            with db.session.begin_nested():
                db.session.add(shared)
                db.session.flush()
        except IntegrityError:
            db.session.rollback()
            shared = _catalog_match({**details, 'barcode': barcode}, photo_hash)
            if not shared:
                raise
    return _link_product(user_id, shared, routine)


@mi_neceser_bp.post('/productos/catalogo')
@require_auth
def add_catalog_product():
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get('catalog_id'), str):
        return jsonify({'error': 'Producto inválido'}), 400
    routine = data.get('routine', 'auto')
    if routine not in ('auto', 'morning', 'evening', 'both'):
        return jsonify({'error': 'Rutina inválida'}), 400
    shared = db.session.get(CatalogProduct, data['catalog_id'])
    if not shared:
        return jsonify({'error': 'Producto no encontrado en el catálogo'}), 404
    return _link_product(user.id, shared, routine)


@mi_neceser_bp.post('/productos/<product_id>/etiqueta')
@require_auth
def add_product_label(product_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    product = UserProduct.query.filter_by(id=product_id, user_id=user.id, active=True).first()
    if not product:
        return jsonify({'error': 'Producto no encontrado'}), 404
    target = product.shared_product or product
    if not target.photo:
        return jsonify({'error': 'El producto necesita una foto del frente para verificar la etiqueta.'}), 422
    if request.content_length and request.content_length > MAX_PHOTO_BYTES + 65536:
        return jsonify({'error': 'La foto debe pesar como máximo 8 MB.'}), 413
    previous_back = target.back_photo
    recheck = request.form.get('recheck') == 'yes'
    replace = request.form.get('replace') == 'yes'
    if recheck and replace:
        return jsonify({'error': 'Elige si quieres verificar o cambiar la etiqueta.'}), 400
    if previous_back and not (recheck or replace):
        return jsonify({'error': 'Este producto ya tiene una etiqueta trasera.'}), 409
    if (recheck or replace) and not previous_back:
        return jsonify({'error': 'El producto todavía no tiene una etiqueta guardada.'}), 400
    back = (FileStorage(stream=BytesIO(previous_back), filename='etiqueta.webp')
            if recheck and previous_back else request.files.get('back'))
    if not back or (not recheck and request.form.get('own_photo') != 'yes'):
        return jsonify({'error': 'Agrega y confirma una foto propia de la etiqueta trasera.'}), 400
    model, target_id, front = type(target), target.id, target.photo
    db.session.rollback()
    try:
        front_image, _ = prepare_photo(FileStorage(stream=BytesIO(front)))
        back_image, preview = prepare_photo(back, preview_size=1600)
        photos = [front_image]
        if replace:
            if preview == previous_back:
                raise ValueError('La foto que elegiste es igual a la etiqueta actual.')
            previous_image, _ = prepare_photo(FileStorage(stream=BytesIO(previous_back)))
            photos.append(previous_image)
        details = analyze_photos([*photos, back_image], label_only=True, label_replacement=replace)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 422
    except GeminiUnavailable as exc:
        return jsonify({'error': str(exc)}), 503

    target = db.session.get(model, target_id)
    if not target:
        return jsonify({'error': 'Producto no encontrado'}), 404
    values = {'back_photo': previous_back if recheck else preview}
    values.update(_photo_enrichment(target, details))
    changed = db.session.execute(update(model).where(
        model.id == target_id, model.back_photo == previous_back, model.photo == front,
    ).values(**values))
    if not changed.rowcount:
        db.session.rollback()
        return jsonify({'error': 'Las fotos del producto cambiaron durante la revisión. Vuelve a intentar.'}), 409
    db.session.commit()
    return jsonify(_serialize_product(db.session.get(UserProduct, product_id))), 201


@mi_neceser_bp.post('/productos/<product_id>/foto')
@require_auth
def replace_product_photo(product_id):
    user = _get_user()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    user_id = user.id
    product = UserProduct.query.filter_by(id=product_id, user_id=user_id, active=True).first()
    if not product:
        return jsonify({'error': 'Producto no encontrado'}), 404
    target = product.shared_product or product
    if not target.photo:
        return jsonify({'error': 'Este producto no tiene una foto anterior para comparar.'}), 422
    if request.content_length and request.content_length > MAX_PHOTO_BYTES + 65536:
        return jsonify({'error': 'La foto debe pesar como máximo 8 MB.'}), 413
    upload = request.files.get('front')
    if not upload or request.form.get('own_photo') != 'yes':
        return jsonify({'error': 'Agrega y confirma una foto propia del frente.'}), 400

    model, target_id, original, back_photo = type(target), target.id, target.photo, target.back_photo
    db.session.rollback()
    try:
        candidate_image, preview = prepare_photo(upload, preview_size=960)
        if original == preview:
            raise ValueError('La foto que elegiste es igual a la actual.')
        current_image, _ = prepare_photo(FileStorage(stream=BytesIO(original)))
        analyze_photos([current_image, candidate_image], replacement=True)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 422
    except GeminiUnavailable as exc:
        return jsonify({'error': str(exc)}), 503

    try:
        photos = [candidate_image]
        if back_photo:
            rear_image, _ = prepare_photo(FileStorage(stream=BytesIO(back_photo)))
            photos.append(rear_image)
        details = analyze_photos(photos, reevaluate=True)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 422
    except GeminiUnavailable as exc:
        return jsonify({'error': str(exc)}), 503

    product = UserProduct.query.filter_by(id=product_id, user_id=user_id, active=True).with_for_update().first()
    if not product:
        return jsonify({'error': 'Producto no encontrado'}), 404
    target = product.shared_product or product
    if type(target) is not model or target.id != target_id:
        return jsonify({'error': 'La ficha cambió. Vuelve a intentar.'}), 409
    if not _matches_photo_details(target, details):
        return jsonify({'error': 'La nueva foto no coincide con el producto o la presentación guardada.'}), 422
    if target.back_photo != back_photo:
        return jsonify({'error': 'La etiqueta cambió durante la verificación. Vuelve a intentar.'}), 409
    values = {'photo': preview}
    values.update(_photo_enrichment(target, details))
    if model is CatalogProduct:
        values['photo_hash'] = sha256(preview).hexdigest()
    try:
        condition = (model.id == target_id) & (model.photo == original) & (model.back_photo == back_photo)
        result = db.session.execute(update(model).where(condition).values(**values))
        if not result.rowcount:
            db.session.rollback()
            return jsonify({'error': 'La foto actual cambió. Vuelve a intentar.'}), 409
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Esta foto ya se usa en otro producto del catálogo.'}), 409
    return jsonify(_serialize_product(product))


@mi_neceser_bp.route('/productos', methods=['GET'])
@require_auth
def list_products():
    user = _get_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    products = UserProduct.query.filter_by(user_id=user.id, active=True).order_by(UserProduct.created_at.desc()).all()
    return jsonify({'items': [_serialize_product(product) for product in products]}), 200


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
    if 'routine' in data and data['routine'] not in ('morning', 'evening', 'both'):
        return jsonify({'error': 'Rutina inválida'}), 400
    for field in ['name', 'brand', 'category', 'inci', 'opened_at', 'expires_at', 'quantity_state', 'active', 'paused_until', 'notes', 'routine']:
        if field in data:
            setattr(product, field, data[field])
    if 'name' in data:
        product.name_es = None
    if 'inci' in data:
        product.ingredients_es = None

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
