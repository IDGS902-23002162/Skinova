import uuid
from datetime import datetime, timezone
from app.extensions import db

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50))
    title = db.Column(db.String(200))
    message = db.Column(db.Text)
    action_path = db.Column(db.String(255))
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_notifications_user_created', 'user_id', 'created_at'),
    )
