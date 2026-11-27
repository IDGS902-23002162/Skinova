import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from app.extensions import db
from app.modules.directorio.models import Dermatologist, FavoriteDermatologist
from app.modules.users.models import User

logger = logging.getLogger(__name__)

# Coordenadas de referencia por defecto (León, Guanajuato)
DEFAULT_LAT = 21.1219
DEFAULT_LON = -101.6826

# Catálogo base de dermatólogos certificados (RF-DER-02 al RF-DER-10)
INITIAL_DERMATOLOGISTS_SEED = [
    {
        "id": "der-1",
        "name": "Dra. Valeria Montes de Oca",
        "specialty": "Dermatología Clínica y Cosmética",
        "license_number": "Céd. Prof. 8492014 · Certificada por el CMCD",
        "clinic": "Centro Dermatológico del Bajío",
        "address": "Av. Cerro Gordo 290, Cons. 402, Campestre, León, Gto.",
        "city": "León",
        "state": "Guanajuato",
        "latitude": 21.1558,
        "longitude": -101.6961,
        "care_type": "ambos",
        "care_label": "Presencial y En línea",
        "rating": 4.9,
        "reviews_count": 128,
        "focus_areas": ["Acné severo", "Rosácea", "Dermatitis atópica", "Manchas"],
        "schedule": "Lun a Vie · 09:00 - 19:00",
        "phone": "+52 477 718 4520",
        "email": "contacto@dravaleriamontes.mx",
        "website": None,
        "booking_platform": "Doctoralia",
        "booking_url": "https://www.doctoralia.com.mx/",
        "map_query": "Av.+Cerro+Gordo+290+Leon+Guanajuato",
        "pin_coords": {"top": "36%", "left": "44%"},
        "is_verified": True
    },
    {
        "id": "der-2",
        "name": "Dr. Sebastian Herrera",
        "specialty": "Dermato-Oncología y Cirugía Dermatológica",
        "license_number": "Céd. Prof. 7310942 · Especialista en Lesiones Pigmentadas",
        "clinic": "Hospital Ángeles León · Torre de Especialidades",
        "address": "Av. Cerro Gordo 311, Cons. 615, Lomas del Campestre, León, Gto.",
        "city": "León",
        "state": "Guanajuato",
        "latitude": 21.1572,
        "longitude": -101.6983,
        "care_type": "presencial",
        "care_label": "Solo Presencial",
        "rating": 5.0,
        "reviews_count": 94,
        "focus_areas": ["Revisión de lunares", "Melasma", "Cicatrices", "Fotodaño"],
        "schedule": "Lun a Sáb · 10:00 - 18:00",
        "phone": "+52 477 788 5600",
        "email": "citas@drsebastianherrera.com",
        "website": None,
        "booking_platform": "Doctoralia",
        "booking_url": "https://www.doctoralia.com.mx/",
        "map_query": "Hospital+Angeles+Leon+Guanajuato",
        "pin_coords": {"top": "28%", "left": "62%"},
        "is_verified": True
    },
    {
        "id": "der-3",
        "name": "Dra. Camila Solis",
        "specialty": "Tricología y Barrera Cutánea Sensible",
        "license_number": "Céd. Prof. 9120455 · Miembro de la SMD",
        "clinic": "Clínica DermaVita Jardines",
        "address": "Blvd. Paseo de los Insurgentes 1804, Jardines del Moral, León, Gto.",
        "city": "León",
        "state": "Guanajuato",
        "latitude": 21.1441,
        "longitude": -101.6908,
        "care_type": "ambos",
        "care_label": "Presencial y En línea",
        "rating": 4.8,
        "reviews_count": 76,
        "focus_areas": ["Piel reactiva", "Alergias cutáneas", "Acné hormonal"],
        "schedule": "Mar a Sáb · 09:30 - 17:30",
        "phone": "+52 477 390 1122",
        "email": "agenda@dermavita.mx",
        "website": None,
        "booking_platform": None,
        "booking_url": None,
        "map_query": "Paseo+de+los+Insurgentes+1804+Leon+Guanajuato",
        "pin_coords": {"top": "58%", "left": "32%"},
        "is_verified": True
    },
    {
        "id": "der-4",
        "name": "Dr. Mateo Elizondo",
        "specialty": "Teledermatología y Seguimiento Dermoestético",
        "license_number": "Céd. Prof. 8834120 · Especialista Certificado",
        "clinic": "Consultorio Médico Puerta Bajío",
        "address": "Blvd. Aeropuerto 104, Torre Médica Sur, León, Gto.",
        "city": "León",
        "state": "Guanajuato",
        "latitude": 21.0920,
        "longitude": -101.6210,
        "care_type": "en_linea",
        "care_label": "Atención En Línea",
        "rating": 4.7,
        "reviews_count": 61,
        "focus_areas": ["Ajuste de retinoides", "Sensibilidad", "Control de sebo"],
        "schedule": "Lun a Vie · 08:00 - 20:00",
        "phone": "+52 477 601 9980",
        "email": "consulta@drmateoelizondo.mx",
        "website": None,
        "booking_platform": None,
        "booking_url": None,
        "map_query": "Blvd+Aeropuerto+104+Leon+Guanajuato",
        "pin_coords": {"top": "74%", "left": "72%"},
        "is_verified": True
    },
    {
        "id": "der-5",
        "name": "Dra. Sofía Carvajal",
        "specialty": "Dermatología Pediátrica y Clínica",
        "license_number": "Céd. Prof. 7821903 · Certificada por la CADD",
        "clinic": "Médica Campestre León",
        "address": "Calle Manantial 102, Manzanares, León, Gto.",
        "city": "León",
        "state": "Guanajuato",
        "latitude": 21.1180,
        "longitude": -101.6620,
        "care_type": "presencial",
        "care_label": "Solo Presencial",
        "rating": 4.9,
        "reviews_count": 83,
        "focus_areas": ["Eccema", "Dermatitis seborreica", "Urticaria", "Infecciones cutáneas"],
        "schedule": "Lun a Vie · 10:00 - 18:00",
        "phone": "+52 477 214 7890",
        "email": "dra.sofiacarvajal@medicacampestre.com",
        "website": None,
        "booking_platform": "Doctoralia",
        "booking_url": "https://www.doctoralia.com.mx/",
        "map_query": "Medica+Campestre+Leon+Guanajuato",
        "pin_coords": {"top": "50%", "left": "52%"},
        "is_verified": True
    }
]


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula la distancia geodésica exacta en kilómetros entre dos coordenadas
    utilizando la fórmula del semiverseno (Haversine) (RF-DER-02, RF-DER-06).
    """
    R = 6371.0  # Radio medio de la Tierra en kilómetros

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def ensure_dermatologists_seeded():
    """Siembra los especialistas base en la base de datos si la tabla está vacía."""
    try:
        count = Dermatologist.query.count()
        if count == 0:
            for item in INITIAL_DERMATOLOGISTS_SEED:
                doc = Dermatologist(
                    id=item["id"],
                    name=item["name"],
                    specialty=item["specialty"],
                    license_number=item["license_number"],
                    clinic=item["clinic"],
                    address=item["address"],
                    city=item["city"],
                    state=item["state"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    care_type=item["care_type"],
                    care_label=item["care_label"],
                    rating=item["rating"],
                    reviews_count=item["reviews_count"],
                    focus_areas=item["focus_areas"],
                    schedule=item["schedule"],
                    phone=item["phone"],
                    email=item["email"],
                    website=item["website"],
                    booking_platform=item["booking_platform"],
                    booking_url=item["booking_url"],
                    map_query=item["map_query"],
                    pin_coords=item["pin_coords"],
                    is_verified=item["is_verified"]
                )
                db.session.add(doc)
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.warning(f"Error verificando semilla de dermatólogos: {e}")


def get_user_favorite_ids(user_id: Optional[str]) -> List[str]:
    """Retorna la lista de IDs de dermatólogos favoritos para el usuario."""
    if not user_id:
        return []
    favs = FavoriteDermatologist.query.filter_by(user_id=user_id).all()
    return [f.external_id for f in favs]


def search_dermatologists(
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
    query: str = "",
    max_distance_km: float = 50.0,
    care_type: str = "todos",
    only_favorites: bool = False,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Busca y filtra dermatólogos cercanos (RF-DER-02 al RF-DER-07):
    - Filtrado por cercanía geográfica (RF-DER-06)
    - Filtrado por modalidad de atención (RF-DER-07: presencial, en_linea, ambos)
    - Búsqueda por término (nombre, clínica, especialidad, síntomas)
    - Marcado de favoritos por usuario (RF-DER-11)
    - Ordenado por proximidad
    """
    ensure_dermatologists_seeded()

    effective_lat = user_lat if user_lat is not None else DEFAULT_LAT
    effective_lon = user_lon if user_lon is not None else DEFAULT_LON

    favorite_ids = set(get_user_favorite_ids(user_id)) if user_id else set()

    all_docs = Dermatologist.query.filter_by(is_verified=True).all()
    clean_query = query.strip().lower()

    results = []
    for doc in all_docs:
        # 1. Distancia geodésica
        distance = calculate_haversine_distance(
            effective_lat, effective_lon, doc.latitude, doc.longitude
        )

        if distance > max_distance_km:
            continue

        # 2. Filtro por tipo de atención
        if care_type != "todos":
            if doc.care_type != care_type and doc.care_type != "ambos":
                continue

        # 3. Filtro por favoritos
        is_fav = doc.id in favorite_ids
        if only_favorites and not is_fav:
            continue

        # 4. Filtro por texto
        if clean_query:
            focus_match = any(clean_query in f.lower() for f in (doc.focus_areas or []))
            text_match = (
                clean_query in doc.name.lower()
                or clean_query in doc.specialty.lower()
                or clean_query in (doc.clinic or "").lower()
                or clean_query in doc.address.lower()
                or clean_query in doc.city.lower()
                or focus_match
            )
            if not text_match:
                continue

        results.append((doc, distance, is_fav))

    # Ordenar por proximidad
    results.sort(key=lambda x: x[1])

    return [
        doc.to_dict(distance_km=dist, is_favorite=fav)
        for doc, dist, fav in results
    ]


def toggle_dermatologist_favorite(user_id: str, doctor_id: str) -> Dict[str, Any]:
    """Agrega o quita un especialista de la lista de favoritos (RF-DER-11)."""
    fav = FavoriteDermatologist.query.filter_by(user_id=user_id, external_id=doctor_id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
        return {"doctorId": doctor_id, "isFavorite": False}

    doc = db.session.get(Dermatologist, doctor_id)
    new_fav = FavoriteDermatologist(
        user_id=user_id,
        external_id=doctor_id,
        name=doc.name if doc else f"Dr. {doctor_id}",
        address=doc.address if doc else None,
        phone=doc.phone if doc else None
    )
    db.session.add(new_fav)
    db.session.commit()
    return {"doctorId": doctor_id, "isFavorite": True}


def get_ai_referral_status(user_id: Optional[str]) -> Dict[str, Any]:
    """
    Evalúa si la IA ha detectado alguna condición que requiera atención médica presencial (RF-DER-12, RNF-17, RNF-18).
    Revisa evaluaciones dermatológicas o consultas IA que marcaron 'requires_professional_attention=True'.
    """
    default_response = {
        "has_active_referral": False,
        "title": "Sin derivaciones médicas activas",
        "message": "Skinova no ha detectado señales que ameriten consulta médica prioritaria en tus últimos análisis.",
        "detected_concern": None,
        "recommended_specialty": "Dermatología General",
        "evaluated_at": None
    }

    if not user_id:
        return default_response

    # 1. Revisar si hay evaluaciones de piel que marcaron atención profesional
    try:
        from app.modules.perfil_salud.models import SkinEvaluation
        eval_record = SkinEvaluation.query.filter_by(
            user_id=user_id,
            requires_professional_attention=True
        ).order_by(SkinEvaluation.created_at.desc()).first()

        if eval_record:
            return {
                "has_active_referral": True,
                "title": "Recomendación de valoración dermatológica profesional",
                "message": (
                    "Tu último análisis en Skinova identificó características cutáneas que requieren "
                    "evaluación médica presencial y exceden el alcance de recomendaciones cosméticas."
                ),
                "detected_concern": eval_record.summary or "Sensibilidad cutánea o reactividad persistente",
                "recommended_specialty": "Dermatología Clínica",
                "evaluated_at": eval_record.created_at.isoformat() if eval_record.created_at else None
            }
    except Exception as e:
        logger.warning(f"Error revisando skin_evaluations: {e}")

    # 2. Revisar si hay consultas en ai_history que marcaron atención médica
    try:
        from app.modules.ai_history.models import AiHistory
        history_record = AiHistory.query.filter_by(
            user_id=user_id,
            requires_professional_attention=True
        ).order_by(AiHistory.created_at.desc()).first()

        if history_record:
            return {
                "has_active_referral": True,
                "title": "Recomendación de valoración dermatológica profesional",
                "message": (
                    f"Durante la consulta de '{history_record.subject or 'producto'}', la IA identificó "
                    "riesgos de reactividad que justifican la orientación de un dermatólogo certificado."
                ),
                "detected_concern": history_record.summary or "Contraindicación detectada por IA",
                "recommended_specialty": "Dermatología Clínica y Alergología Cutánea",
                "evaluated_at": history_record.created_at.isoformat() if history_record.created_at else None
            }
    except Exception as e:
        logger.warning(f"Error revisando ai_history: {e}")

    return default_response
