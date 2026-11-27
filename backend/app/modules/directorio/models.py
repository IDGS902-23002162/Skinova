import uuid
from datetime import datetime, timezone
from app.extensions import db


class Dermatologist(db.Model):
    """
    Especialista dermatológico registrado en el directorio (RF-DER-02 al RF-DER-10).
    Almacena información pública verificada, geolocalización para mapa, datos de contacto
    y enlaces a plataformas externas de agendamiento.
    """
    __tablename__ = "dermatologists"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    specialty = db.Column(db.String(255), nullable=False)
    license_number = db.Column(db.String(255), nullable=True)  # Cédula profesional
    clinic = db.Column(db.String(255), nullable=True)
    address = db.Column(db.Text, nullable=False)
    city = db.Column(db.String(100), default="León", nullable=False)
    state = db.Column(db.String(100), default="Guanajuato", nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    care_type = db.Column(db.String(30), default="ambos", nullable=False)  # presencial | en_linea | ambos
    care_label = db.Column(db.String(80), default="Presencial y En línea", nullable=False)
    rating = db.Column(db.Float, default=4.9, nullable=False)
    reviews_count = db.Column(db.Integer, default=50, nullable=False)
    focus_areas = db.Column(db.JSON, nullable=True)  # Lista de afecciones (Acné severo, Rosácea, etc.)
    schedule = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    booking_platform = db.Column(db.String(100), nullable=True)  # Doctoralia, etc.
    booking_url = db.Column(db.String(500), nullable=True)
    map_query = db.Column(db.String(255), nullable=True)
    pin_coords = db.Column(db.JSON, nullable=True)  # Coordenadas relativas para mapa ilustrativo
    is_verified = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self, distance_km=None, is_favorite=False):
        return {
            "id": self.id,
            "name": self.name,
            "specialty": self.specialty,
            "license": self.license_number,
            "clinic": self.clinic,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "distanceKm": round(distance_km, 1) if distance_km is not None else None,
            "careType": self.care_type,
            "careLabel": self.care_label,
            "rating": round(self.rating, 1),
            "reviewsCount": self.reviews_count,
            "focusAreas": self.focus_areas or [],
            "schedule": self.schedule,
            "contact": {
                "phone": self.phone,
                "email": self.email,
                "website": self.website,
            },
            "bookingPlatform": self.booking_platform,
            "bookingUrl": self.booking_url,
            "mapQuery": self.map_query,
            "pinCoords": self.pin_coords or {"top": "50%", "left": "50%"},
            "isFavorite": is_favorite,
            "isVerified": self.is_verified,
        }


class FavoriteDermatologist(db.Model):
    """
    Especialistas guardados como favoritos por cada usuario (RF-DER-11).
    """
    __tablename__ = "favorite_dermatologists"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    external_id = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=True)
    address = db.Column(db.Text, nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        db.UniqueConstraint("user_id", "external_id", name="uix_user_dermatologist"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "externalId": self.external_id,
            "name": self.name,
            "address": self.address,
            "phone": self.phone,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
