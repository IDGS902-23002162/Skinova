import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_user_id = db.Column(db.String(255), nullable=False, unique=True)
    role = db.Column(db.String(30), nullable=False, default='user')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    # Relationships (optional, for convenience)
    # profile = db.relationship('UserProfile', backref='user', uselist=False)

class ProfileLike(db.Model):
    __tablename__ = 'profile_likes'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    liked_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'liked_user_id', name='uix_user_liked'),
    )

class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, unique=True)
    provider = db.Column(db.String(50))
    external_subscription_id = db.Column(db.String(255))
    plan_code = db.Column(db.String(50))
    status = db.Column(db.String(50))
    current_period_end = db.Column(db.DateTime)
    cancel_at_period_end = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))
