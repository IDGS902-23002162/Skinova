import uuid
from datetime import datetime, timezone
from app.extensions import db

class PwaVisit(db.Model):
    __tablename__ = 'pwa_visits'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    module_name = db.Column(db.String(50), nullable=False) # e.g. rutinas, consulta_ia, mi_neceser, bitacora, habitos, ambiente, comunidad, directorio, dashboard
    path = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class UserActivityLog(db.Model):    
    __tablename__ = 'user_activity_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False) # e.g. login, subscribe, update_routine, ai_query
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class ApiRequestLog(db.Model):
    __tablename__ = 'api_request_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    method = db.Column(db.String(10), nullable=False)
    path = db.Column(db.String(255), nullable=False)
    status_code = db.Column(db.Integer, nullable=False)
    duration_ms = db.Column(db.Float, nullable=False)
    is_ai = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

