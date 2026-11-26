import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON
from sqlalchemy.dialects.mysql import MEDIUMBLOB
from app.extensions import db

class CatalogProduct(db.Model):
    __tablename__ = 'neceser_catalog_products'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    identity = db.Column(db.String(64), nullable=False, unique=True)
    barcode = db.Column(db.String(14), unique=True)
    photo_hash = db.Column(db.String(64), nullable=False, unique=True)
    photo = db.Column(db.LargeBinary().with_variant(MEDIUMBLOB(), 'mysql', 'mariadb'), nullable=False)
    back_photo = db.Column(db.LargeBinary().with_variant(MEDIUMBLOB(), 'mysql', 'mariadb'))
    details = db.Column(JSON, nullable=False)


class UserProduct(db.Model):
    __tablename__ = 'user_products'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    shared_product_id = db.Column(db.String(36), db.ForeignKey('neceser_catalog_products.id'), index=True)
    shared_product = db.relationship(CatalogProduct)
    name = db.Column(db.String(255), nullable=False)
    name_es = db.Column(db.String(255))
    brand = db.Column(db.String(150))
    category = db.Column(db.String(100))
    inci = db.Column(db.Text)
    ingredients_es = db.Column(db.Text)
    opened_at = db.Column(db.Date)
    expires_at = db.Column(db.Date)
    quantity_state = db.Column(db.String(30)) # new | medium | almost_empty
    active = db.Column(db.Boolean, default=True)
    paused_until = db.Column(db.Date)
    notes = db.Column(db.Text)
    routine = db.Column(db.String(20), nullable=False, default='both')
    catalog_source = db.Column(db.String(50))
    catalog_code = db.Column(db.String(32))
    image_url = db.Column(db.String(500))
    product_url = db.Column(db.String(500))
    quantity = db.Column(db.String(100))
    photo = db.Column(db.LargeBinary().with_variant(MEDIUMBLOB(), 'mysql', 'mariadb'))
    back_photo = db.Column(db.LargeBinary().with_variant(MEDIUMBLOB(), 'mysql', 'mariadb'))
    side_effects = db.Column(db.Text)
    warnings = db.Column(db.Text)
    label_verification = db.Column(JSON)
    purchase_links = db.Column(JSON)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))
