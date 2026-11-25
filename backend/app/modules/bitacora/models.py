import uuid
from datetime import datetime, timezone
from app.extensions import db
from sqlalchemy.dialects.mysql import MEDIUMTEXT

class ProgressEntry(db.Model):
    __tablename__ = 'progress_entries'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    routine_id = db.Column(db.String(36), db.ForeignKey('routines.id'))
    perception = db.Column(db.String(50)) # better | same | worse | irritated | dry...
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    photos = db.relationship('ProgressPhoto', backref='progress_entry', lazy=True, cascade='all, delete-orphan')

    __table_args__ = (
        db.Index('ix_progress_user_created', 'user_id', 'created_at'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'routine_id': self.routine_id,
            'perception': self.perception,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'photos': [p.to_dict() for p in self.photos]
        }


class ProgressPhoto(db.Model):
    __tablename__ = 'progress_photos'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    progress_entry_id = db.Column(db.String(36), db.ForeignKey('progress_entries.id'), nullable=False)
    storage_key = db.Column(MEDIUMTEXT, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'progress_entry_id': self.progress_entry_id,
            'storage_key': self.storage_key,
            'url': self.storage_key,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


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

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'log_date': self.log_date.isoformat() if self.log_date else None,
            'water_ml': self.water_ml,
            'sleep_hours': float(self.sleep_hours) if self.sleep_hours is not None else None,
            'stress_level': self.stress_level,
            'activity_minutes': self.activity_minutes,
            'menstrual_cycle_info': self.menstrual_cycle_info,
            'notes': self.notes
        }

# Re-exportar Notification en este mismo módulo para disponibilidad en el mismo directorio (RF-NOT-01 a RF-NOT-15)
from app.modules.notificaciones.models import Notification
