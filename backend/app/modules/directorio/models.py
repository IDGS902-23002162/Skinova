import uuid
from datetime import datetime, timezone
from app.extensions import db

class FavoriteDermatologist(db.Model):
    __tablename__ = 'favorite_dermatologists'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    external_id = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255))
    address = db.Column(db.Text)
    phone = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'external_id', name='uix_user_dermatologist'),
    )
