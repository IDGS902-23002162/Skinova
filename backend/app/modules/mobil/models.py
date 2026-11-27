import json
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

class SystemLog(db.Model):
    __tablename__ = 'system_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = db.Column(db.String(20), nullable=False) # error, login, warning, info, success
    message = db.Column(db.Text, nullable=False)
    origin = db.Column(db.String(120), nullable=False, default='sistema')
    component = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class AppSetting(db.Model):
    __tablename__ = 'app_settings'

    key = db.Column(db.String(64), primary_key=True)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


DEFAULT_PLANS = [
    {
        "code": "free",
        "name": "Gratuito",
        "price": 0,
        "features": "Consulta IA limitada · Rutinas básicas · Sin Neceser",
    },
    {
        "code": "skinova_premium",
        "name": "Premium",
        "price": 149,
        "features": "Consulta IA ilimitada · Todas las funciones · Prioridad",
    },
]

DEFAULT_FEATURES = {
    "consulta_ia": True,
    "comunidad": True,
    "directorio": True,
    "maintenance_mode": False,
    "registration_enabled": True,
}


def get_app_settings():
    """Obtiene planes y feature flags desde BD con valores por defecto."""
    try:
        AppSetting.__table__.create(db.engine, checkfirst=True)
        rows = {r.key: json.loads(r.value) for r in AppSetting.query.all()}
    except Exception:
        rows = {}
    return {
        "plans": rows.get("plans", DEFAULT_PLANS),
        "features": {**DEFAULT_FEATURES, **rows.get("features", {})},
    }


def save_app_setting(key, data):
    AppSetting.__table__.create(db.engine, checkfirst=True)
    row = AppSetting.query.get(key)
    payload = json.dumps(data)
    if row: 
        row.value = payload
    else:
        db.session.add(AppSetting(key=key, value=payload))
    db.session.commit()

