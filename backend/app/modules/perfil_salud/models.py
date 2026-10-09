import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON
from app.extensions import db

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), primary_key=True)
    preferred_name = db.Column(db.String(100))
    assistant_tone = db.Column(db.String(30), default='warm')
    skin_type = db.Column(db.String(50))
    sensitivity_level = db.Column(db.String(50))
    goals = db.Column(JSON)
    dermatological_history = db.Column(JSON)
    budget = db.Column(db.String(50))
    consents = db.Column(JSON)
    timezone = db.Column(db.String(100))
    notification_preferences = db.Column(JSON)
    use_location = db.Column(db.Boolean, default=False)
    manual_city = db.Column(db.String(150))
    onboarding_completed = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

class UserRestriction(db.Model):
    __tablename__ = 'user_restrictions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    type = db.Column(db.String(30), nullable=False) # allergy | sensitivity
    name = db.Column(db.String(200), nullable=False)
    notes = db.Column(db.Text)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

class SkinEvaluation(db.Model):
    __tablename__ = 'skin_evaluations'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    metrics_json = db.Column(JSON, nullable=False)
    summary = db.Column(db.Text)
    warnings_json = db.Column(JSON, default=[])
    requires_professional_attention = db.Column(db.Boolean, default=False)
    confirmed = db.Column(db.Boolean, default=False)
    ai_provider = db.Column(db.String(50))
    ai_model = db.Column(db.String(100))

