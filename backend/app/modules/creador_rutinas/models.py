import uuid
from datetime import datetime, timezone
from app.extensions import db

class Routine(db.Model):
    __tablename__ = 'routines'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    previous_version_id = db.Column(db.String(36), db.ForeignKey('routines.id'))
    name = db.Column(db.String(150))
    period = db.Column(db.String(20), nullable=False) # morning | night
    version = db.Column(db.Integer, nullable=False, default=1)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

class RoutineStep(db.Model):
    __tablename__ = 'routine_steps'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    routine_id = db.Column(db.String(36), db.ForeignKey('routines.id'), nullable=False)
    step_order = db.Column(db.Integer, nullable=False)
    user_product_id = db.Column(db.String(36), db.ForeignKey('user_products.id'))
    recommended_product = db.Column(db.String(255))
    instructions = db.Column(db.Text)
    amount = db.Column(db.String(100))
    frequency = db.Column(db.String(100))
    purpose = db.Column(db.Text)

    __table_args__ = (
        db.UniqueConstraint('routine_id', 'step_order', name='uix_routine_step'),
    )

class RoutineCompletion(db.Model):
    __tablename__ = 'routine_completions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    routine_step_id = db.Column(db.String(36), db.ForeignKey('routine_steps.id'), nullable=False)
    completion_date = db.Column(db.Date, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('routine_step_id', 'completion_date', name='uix_step_completion'),
    )
