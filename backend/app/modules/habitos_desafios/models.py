import uuid
from datetime import datetime, timezone

from app.extensions import db


class Habit(db.Model):
    __tablename__ = 'user_habits'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    frequency = db.Column(db.String(30), default='daily')
    target_value = db.Column(db.Integer, default=1)
    unit = db.Column(db.String(50), default='veces')
    focus = db.Column(db.String(20), nullable=False, default='general')
    product_ids = db.Column(db.JSON, default=list)
    cycle_plan = db.Column(db.JSON)
    color = db.Column(db.String(30), default='#A9C4B5')
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'frequency': self.frequency,
            'target_value': self.target_value,
            'unit': self.unit,
            'focus': self.focus,
            'product_ids': self.product_ids or [],
            'color': self.color,
            'active': self.active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Challenge(db.Model):
    __tablename__ = 'user_challenges'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    difficulty = db.Column(db.String(30), default='medium')
    reward = db.Column(db.String(150))
    status = db.Column(db.String(30), default='active')
    duration_days = db.Column(db.Integer, default=7)
    unit = db.Column(db.String(50), nullable=False, default='días')
    focus = db.Column(db.String(20), nullable=False, default='general')
    product_ids = db.Column(db.JSON, default=list)
    cycle_plan = db.Column(db.JSON)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    days = db.relationship('ChallengeDay', cascade='all, delete-orphan')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'difficulty': self.difficulty,
            'reward': self.reward,
            'status': self.status,
            'duration_days': self.duration_days,
            'unit': self.unit,
            'focus': self.focus,
            'product_ids': self.product_ids or [],
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class HabitEntry(db.Model):
    __tablename__ = 'habit_entries'

    habit_id = db.Column(db.String(36), db.ForeignKey('user_habits.id', ondelete='CASCADE'), primary_key=True)
    day = db.Column(db.Date, primary_key=True)
    value = db.Column(db.Integer, nullable=False)


class ChallengeDay(db.Model):
    __tablename__ = 'challenge_days'

    challenge_id = db.Column(db.String(36), db.ForeignKey('user_challenges.id', ondelete='CASCADE'), primary_key=True)
    day = db.Column(db.Date, primary_key=True)
