import uuid
from datetime import datetime, timezone
from app.extensions import db


class UserEnvironmentalPreference(db.Model):
    """
    Preferencias ambientales del usuario:
    - Control de consentimiento de ubicación (RF-AMB-01)
    - Selección manual de ciudad de referencia (RF-AMB-02)
    - Conexión con el creador de rutinas (RF-AMB-10)
    """
    __tablename__ = "user_environmental_preferences"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    use_location = db.Column(db.Boolean, default=False, nullable=False)
    city_name = db.Column(db.String(150), default="León, Gto", nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    sync_with_routine = db.Column(db.Boolean, default=True, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "use_location": self.use_location,
            "city_name": self.city_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "sync_with_routine": self.sync_with_routine,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class EnvironmentalSnapshot(db.Model):
    """
    Instantánea de datos ambientales (temperatura, humedad, índice UV, calidad del aire):
    - Almacena mediciones consultadas y resultados de IA para responder rápidamente (RF-AMB-03 al RF-AMB-07)
    - Alerta por índice UV elevado (RF-AMB-09)
    - Gestión de expiración y auto-actualización con TTL en caché (RF-AMB-11)
    - Indicador de resiliencia / fallback si el proveedor falló (RF-AMB-12)
    """
    __tablename__ = "environmental_snapshots"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    city_name = db.Column(db.String(150), nullable=False, index=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    # Métricas climáticas
    temperature = db.Column(db.Float, nullable=False)  # RF-AMB-03
    feels_like = db.Column(db.Float, nullable=False)
    condition = db.Column(db.String(100), default="Despejado", nullable=False)  # RF-AMB-07
    humidity = db.Column(db.Integer, nullable=False)  # RF-AMB-04
    humidity_status = db.Column(db.String(80), nullable=False)
    uv_index = db.Column(db.Float, nullable=False)  # RF-AMB-05
    uv_level = db.Column(db.String(50), nullable=False)
    is_high_uv = db.Column(db.Boolean, default=False, nullable=False)  # RF-AMB-09
    air_quality_index = db.Column(db.Integer, nullable=True)  # RF-AMB-06 (AQI)
    air_quality_status = db.Column(db.String(80), nullable=True)
    wind_speed = db.Column(db.Float, nullable=True)

    # Recomendación contextual de IA (RF-AMB-08)
    ai_summary = db.Column(db.Text, nullable=True)
    ai_tips = db.Column(db.JSON, nullable=True)

    # Metadatos del proveedor y resiliencia (RF-AMB-11 y RF-AMB-12)
    provider = db.Column(db.String(50), default="open-meteo", nullable=False)
    is_fallback = db.Column(db.Boolean, default=False, nullable=False)
    recorded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)

    def is_expired(self):
        now = datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            # Compatibilidad si la BD retorna naive datetime
            return datetime.utcnow() >= self.expires_at
        return now >= self.expires_at

    def to_dict(self):
        return {
            "id": self.id,
            "city": self.city_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "temp": round(self.temperature, 1),
            "feelsLike": round(self.feels_like, 1),
            "condition": self.condition,
            "humidity": self.humidity,
            "humidityStatus": self.humidity_status,
            "uv": round(self.uv_index, 1),
            "uvLevel": self.uv_level,
            "isHighUv": self.is_high_uv,
            "aqi": self.air_quality_index if self.air_quality_index is not None else 35,
            "aqiStatus": self.air_quality_status or "Buena",
            "windSpeed": self.wind_speed,
            "aiSummary": self.ai_summary or "",
            "aiTips": self.ai_tips or [],
            "provider": self.provider,
            "isFallback": self.is_fallback,
            "recordedAt": self.recorded_at.isoformat() if self.recorded_at else None,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
        }
