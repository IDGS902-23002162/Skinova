import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON
from app.extensions import db

class UserProduct(db.Model):
    __tablename__ = 'user_products'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    brand = db.Column(db.String(150))
    category = db.Column(db.String(100))
    inci = db.Column(db.Text)
    opened_at = db.Column(db.Date)
    expires_at = db.Column(db.Date)
    quantity_state = db.Column(db.String(30)) # new | medium | almost_empty
    active = db.Column(db.Boolean, default=True)
    paused_until = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))
