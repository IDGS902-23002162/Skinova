import uuid
from datetime import datetime, timezone
from app.extensions import db

class ProgressEntry(db.Model):
    __tablename__ = 'progress_entries'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    routine_id = db.Column(db.String(36), db.ForeignKey('routines.id'))
    perception = db.Column(db.String(50)) # better | same | worse | irritated | dry...
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index('ix_progress_user_created', 'user_id', 'created_at'),
    )

class ProgressPhoto(db.Model):
    __tablename__ = 'progress_photos'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    progress_entry_id = db.Column(db.String(36), db.ForeignKey('progress_entries.id'), nullable=False)
    storage_key = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

class HabitLog(db.Model):
    __tablename__ = 'habit_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    log_date = db.Column(db.Date, nullable=False)
    water_ml = db.Column(db.Integer)
    sleep_hours = db.Column(db.Numeric(4, 2))
    stress_level = db.Column(db.Integer)
    activity_minutes = db.Column(db.Integer)
    menstrual_cycle_info = db.Column(db.String(100))
    notes = db.Column(db.Text)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'log_date', name='uix_user_log_date'),
    )
