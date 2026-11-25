import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple, List
import requests

from app.extensions import db
from app.modules.monitoreo_ambiental.models import (
    EnvironmentalSnapshot,
    UserEnvironmentalPreference,
)
from app.modules.users.models import User

logger = logging.getLogger(__name__)

# Configuración de timeouts y caché (RNF-28, RF-AMB-11)
HTTP_TIMEOUT_SECONDS = 4.0
CACHE_TTL_MINUTES = 20

# Ciudades estándar precalculadas para resolución inmediata y fallback (RF-AMB-02, RF-AMB-12)
DEFAULT_CITIES_COORDINATES = {
    "León, Gto": {"lat": 21.1219, "lon": -101.6826, "label": "León, Guanajuato, México"},
    "Ciudad de México": {"lat": 19.4326, "lon": -99.1332, "label": "Ciudad de México, México"},
    "Monterrey, N.L.": {"lat": 25.6866, "lon": -100.3161, "label": "Monterrey, Nuevo León, México"},
    "Guadalajara, Jal": {"lat": 20.6597, "lon": -103.3496, "label": "Guadalajara, Jalisco, México"},
    "Bogotá, Col": {"lat": 4.7110, "lon": -74.0721, "label": "Bogotá, Colombia"},
    "Madrid, España": {"lat": 40.4168, "lon": -3.7038, "label": "Madrid, España"},
    "Buenos Aires, Arg": {"lat": -34.6037, "lon": -58.3816, "label": "Buenos Aires, Argentina"},
}

FALLBACK_MOCK_DATA = {
    "León, Gto": {
        "temp": 28.0,
        "feelsLike": 29.0,
        "condition": "Soleado y seco",
        "humidity": 26,
        "humidityStatus": "Baja (Ambiente seco)",
        "uv": 9.0,
        "uvLevel": "Muy Alto",
        "isHighUv": True,
        "aqi": 42,
        "aqiStatus": "Buena",
        "windSpeed": 11.5,
        "aiSummary": "La combinación de radiación UV muy alta y baja humedad favorece la deshidratación transepidérmica y el estrés oxidativo.",
        "aiTips": [
            "Prioriza un sérum con Ácido Hialurónico sobre la piel húmeda hoy.",
            "Reaplica tu Protector Solar FPS 50+ cada 2 horas si estás al exterior.",
            "Sella tu hidratación con una crema reparadora de barrera."
        ]
    },
    "Ciudad de México": {
        "temp": 23.0,
        "feelsLike": 24.0,
        "condition": "Parcialmente nublado",
        "humidity": 48,
        "humidityStatus": "Óptima",
        "uv": 7.0,
        "uvLevel": "Alto",
        "isHighUv": True,
        "aqi": 85,
        "aqiStatus": "Moderada (Partículas PM2.5)",
        "windSpeed": 8.0,
        "aiSummary": "La presencia moderada de contaminación urbana y radiación UV alta requiere reforzar los antioxidantes por la mañana y la limpieza nocturna.",
        "aiTips": [
            "Utiliza tu Sérum antioxidante (Niacinamida o Vitamina C) por la mañana para neutralizar radicales libres.",
            "Realiza doble limpieza esta noche para retirar micropartículas contaminantes.",
            "No omitas el protector solar aunque observes nubes en el cielo."
        ]
    },
    "Monterrey, N.L.": {
        "temp": 33.0,
        "feelsLike": 35.0,
        "condition": "Caluroso y despejado",
        "humidity": 35,
        "humidityStatus": "Moderada-Baja",
        "uv": 10.0,
        "uvLevel": "Extremo",
        "isHighUv": True,
        "aqi": 60,
        "aqiStatus": "Aceptable",
        "windSpeed": 14.0,
        "aiSummary": "Las altas temperaturas aumentan la producción de sebo mientras que el índice UV extremo exige máxima fotoprotección con texturas ligeras.",
        "aiTips": [
            "Opta por hidratantes en gel o emulsiones ligeras para no saturar los poros.",
            "Usa protector solar de toque seco y busca sombra entre las 11:00 y 16:00 hrs.",
            "Evita exfoliantes fuertes si hoy tuviste exposición solar directa."
        ]
    },
    "Bogotá, Col": {
        "temp": 15.0,
        "feelsLike": 14.0,
        "condition": "Fresco y nublado",
        "humidity": 72,
        "humidityStatus": "Alta",
        "uv": 4.0,
        "uvLevel": "Moderado",
        "isHighUv": False,
        "aqi": 32,
        "aqiStatus": "Buena",
        "windSpeed": 9.2,
        "aiSummary": "El clima frío y húmedo mantiene la hidratación superficial, pero el viento frío puede sensibilizar la piel reactiva.",
        "aiTips": [
            "Usa un limpiador gentil que calme posibles rojeces por el frío.",
            "Aplica protector solar de forma habitual; la altitud mantiene la radiación activa.",
            "Ideal para incorporar activos renovadores suaves en tu rutina nocturna."
        ]
    }
}

# Tabla de códigos WMO meteorológicos a descripciones comprensibles
WMO_CODE_MAP = {
    0: "Despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna densa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia fuerte",
    71: "Nevada ligera",
    80: "Chubascos leves",
    81: "Chubascos moderados",
    82: "Chubascos intensos",
    95: "Tormenta eléctrica",
}


def classify_humidity(humidity: int) -> str:
    """Clasifica el nivel de humedad ambiental (RF-AMB-04)."""
    if humidity < 30:
        return "Baja (Ambiente seco)"
    elif humidity <= 60:
        return "Óptima (Equilibrada)"
    return "Alta (Ambiente húmedo)"


def classify_uv(uv_index: float) -> Tuple[str, bool]:
    """
    Clasifica el índice UV de acuerdo a los estándares de la OMS (RF-AMB-05, RF-AMB-09).
    Retorna (nivel_texto, es_alerta_elevada).
    """
    if uv_index < 3.0:
        return "Bajo", False
    elif uv_index < 6.0:
        return "Moderado", False
    elif uv_index < 8.0:
        return "Alto", True
    elif uv_index < 11.0:
        return "Muy Alto", True
    return "Extremo", True


def classify_aqi(aqi: Optional[int]) -> str:
    """Clasifica el índice de calidad del aire (RF-AMB-06)."""
    if aqi is None:
        return "No disponible"
    if aqi <= 50:
        return "Buena"
    elif aqi <= 100:
        return "Moderada"
    elif aqi <= 150:
        return "Dañina para grupos sensibles"
    elif aqi <= 200:
        return "Dañina"
    return "Muy dañina"


def resolve_coordinates_for_city(city_name: str) -> Tuple[float, float, str]:
    """
    Resuelve el nombre de la ciudad a latitud y longitud.
    Primero consulta el diccionario local rápido; si no coincide, usa Open-Meteo Geocoding.
    """
    clean_name = city_name.strip()
    for known_city, info in DEFAULT_CITIES_COORDINATES.items():
        if known_city.lower() in clean_name.lower() or clean_name.lower() in known_city.lower():
            return info["lat"], info["lon"], known_city

    # Geocodificación externa
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={requests.utils.quote(clean_name)}&count=1&language=es&format=json"
        resp = requests.get(url, timeout=HTTP_TIMEOUT_SECONDS)
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results")
            if results and len(results) > 0:
                res = results[0]
                lat = float(res.get("latitude"))
                lon = float(res.get("longitude"))
                name = res.get("name")
                admin = res.get("admin1") or res.get("country") or ""
                formatted_name = f"{name}, {admin}" if admin else name
                return lat, lon, formatted_name
    except Exception as e:
        logger.warning(f"Error en geocodificación externa para '{city_name}': {e}")

    # Fallback por defecto si no se encuentra
    return 21.1219, -101.6826, clean_name or "León, Gto"


def fetch_external_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Consulta las APIs meteorológicas y de calidad del aire de Open-Meteo (RF-AMB-03 al RF-AMB-07).
    Dispone de control de timeouts para resiliencia (RNF-28).
    """
    weather_url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&"
        f"daily=uv_index_max&hourly=uv_index&timezone=auto"
    )

    aqi_url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality?"
        f"latitude={lat}&longitude={lon}&"
        f"current=us_aqi,pm2_5,pm10&timezone=auto"
    )

    weather_res = requests.get(weather_url, timeout=HTTP_TIMEOUT_SECONDS)
    weather_res.raise_for_status()
    w_data = weather_res.json()

    current_w = w_data.get("current", {})
    temp = float(current_w.get("temperature_2m", 24.0))
    feels_like = float(current_w.get("apparent_temperature", temp))
    humidity = int(current_w.get("relative_humidity_2m", 45))
    w_code = int(current_w.get("weather_code", 0))
    wind_speed = float(current_w.get("wind_speed_10m", 10.0))
    condition = WMO_CODE_MAP.get(w_code, "Parcialmente despejado")

    # Índice UV: priorizar hourly actual o daily max
    uv_val = 5.0
    daily_uv = w_data.get("daily", {}).get("uv_index_max", [])
    hourly_uv = w_data.get("hourly", {}).get("uv_index", [])
    if hourly_uv:
        # Tomar el valor horario aproximado a la hora actual
        now_hour = datetime.now().hour
        if 0 <= now_hour < len(hourly_uv):
            uv_val = float(hourly_uv[now_hour])
        elif daily_uv:
            uv_val = float(daily_uv[0])
    elif daily_uv:
        uv_val = float(daily_uv[0])

    # Calidad del aire opcional (RF-AMB-06)
    aqi_val = 35
    try:
        aqi_res = requests.get(aqi_url, timeout=HTTP_TIMEOUT_SECONDS)
        if aqi_res.status_code == 200:
            aqi_data = aqi_res.json()
            curr_aqi = aqi_data.get("current", {}).get("us_aqi")
            if curr_aqi is not None:
                aqi_val = int(curr_aqi)
    except Exception as e:
        logger.warning(f"Error consultando calidad de aire: {e}")

    uv_level, is_high_uv = classify_uv(uv_val)
    humidity_status = classify_humidity(humidity)
    aqi_status = classify_aqi(aqi_val)

    return {
        "temp": temp,
        "feelsLike": feels_like,
        "condition": condition,
        "humidity": humidity,
        "humidityStatus": humidity_status,
        "uv": uv_val,
        "uvLevel": uv_level,
        "isHighUv": is_high_uv,
        "aqi": aqi_val,
        "aqiStatus": aqi_status,
        "windSpeed": wind_speed,
        "provider": "open-meteo"
    }


def _generate_fallback_ai_recommendations(
    skin_type: str,
    humidity: int,
    uv: float,
    aqi: int,
    temp: float,
    allergies: List[str]
) -> Tuple[str, List[str]]:
    """
    Motor determinístico de respaldo para generar recomendaciones clínicas y cosmetológicas
    cuando la IA externa no esté disponible o haya fallado (RNF-21, RF-AMB-12).
    """
    allergies_lower = [a.lower() for a in allergies]
    avoid_vit_c = any("vitamina c" in a or "ascorb" in a for a in allergies_lower)
    is_dry_env = humidity < 35
    is_high_uv = uv >= 6.0
    is_high_pollution = aqi > 60

    # Construir resumen adaptado
    summary_parts = []
    if is_high_uv and is_dry_env:
        summary_parts.append(
            f"El ambiente seco ({humidity}%) junto con un índice UV de {round(uv, 1)} acelera la evaporación del agua superficial y el daño celular."
        )
    elif is_high_uv:
        summary_parts.append(
            f"La intensa radiación solar (UV {round(uv, 1)}) eleva el riesgo de manchas y fotoenvejecimiento prematuro."
        )
    elif is_dry_env:
        summary_parts.append(
            f"La baja humedad ({humidity}%) compromete la barrera cutánea de tu piel {skin_type.lower()}, aumentando la sensación de tirantez."
        )
    else:
        summary_parts.append(
            f"Las condiciones climáticas actuales son estables, ideales para mantener el equilibrio de tu piel {skin_type.lower()}."
        )

    if is_high_pollution:
        summary_parts.append(
            f"La concentración de partículas ambientales ({aqi} AQI) hace indispensable reforzar la protección antioxidante y la higiene al anochecer."
        )

    ai_summary = " ".join(summary_parts)

    # Tips cosméticos personalizados
    tips = []
    if is_high_uv:
        tips.append("Aplica protector solar FPS 50+ de amplio espectro cada 2 a 3 horas.")
    else:
        tips.append("Mantén tu protección solar matutina diaria habitual.")

    if is_dry_env:
        tips.append("Aplica tu sérum hidratante (Ácido Hialurónico) sobre la piel ligeramente húmeda y sella con crema.")
    elif humidity > 65:
        tips.append("Prefiere hidratantes ligeros en gel para evitar sensación de pesadez u oclusión por el bochorno.")
    else:
        tips.append("Mantén tu hidratación habitual ajustando la textura de acuerdo a tu confort.")

    if is_high_pollution:
        if avoid_vit_c:
            tips.append("Utiliza un sérum antioxidante con Niacinamida por la mañana y realiza doble limpieza por la noche.")
        else:
            tips.append("Aplica antioxidantes (Vitamina C o Niacinamida) por la mañana para neutralizar radicales libres de la polución.")
    elif temp > 28:
        tips.append("Refréscate con bruma termal o agua de rosas a lo largo de la jornada para calmar la vasodilatación.")
    else:
        tips.append("Limpia tu rostro suavemente por la noche para eliminar residuos acumulados durante el día.")

    return ai_summary, tips[:3]


def generate_contextual_ai_recommendations(
    city_name: str,
    weather_data: Dict[str, Any],
    user_context: Dict[str, Any]
) -> Tuple[str, List[str]]:
    """
    Genera recomendaciones contextuales de cuidado de la piel mediante Gemini API (RF-AMB-08).
    Respeta obligatoriamente el perfil, objetivos y alergias del usuario (RNF-16).
    Si Gemini no está disponible o falla, recurre de forma transparente al motor determinístico (RNF-21, RF-AMB-12).
    """
    skin_type = user_context.get("skin_type", "Mixta")
    sensitivity = user_context.get("sensitivity_level", "Media")
    goals = user_context.get("goals", ["Hidratación", "Protección"])
    allergies = user_context.get("allergies", [])

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _generate_fallback_ai_recommendations(
            skin_type,
            weather_data["humidity"],
            weather_data["uv"],
            weather_data["aqi"],
            weather_data["temp"],
            allergies
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key, http_options={"timeout": 10000})
        model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

        system_instruction = (
            "Eres el asesor dermatológico y cosmetológico inteligente de la aplicación Skinova.\n"
            "Tu tarea es interpretar cómo las condiciones ambientales del día impactan la piel de un usuario "
            "y redactar una explicación empática y 3 recomendaciones cosmetológicas concretas.\n"
            "REGLAS ESTRICTAS:\n"
            "1. NO realices diagnósticos médicos; enfócate en el cuidado, barrera cutánea, hidratación y fotoprotección.\n"
            "2. NUNCA sugieras ingredientes a los que el usuario sea alérgico o sensible.\n"
            "3. Devuelve ÚNICAMENTE un objeto JSON válido con las claves:\n"
            "   'summary': string explicativo (2 a 3 oraciones concisas de tono cercano y clínico).\n"
            "   'tips': lista de exactamente 3 consejos específicos para hoy.\n"
        )

        prompt_payload = {
            "city": city_name,
            "conditions": {
                "temperature_celsius": weather_data["temp"],
                "feels_like_celsius": weather_data["feelsLike"],
                "humidity_percentage": weather_data["humidity"],
                "uv_index": weather_data["uv"],
                "uv_level": weather_data["uvLevel"],
                "aqi": weather_data["aqi"],
                "condition": weather_data["condition"]
            },
            "user_profile": {
                "skin_type": skin_type,
                "sensitivity": sensitivity,
                "goals": goals,
                "forbidden_allergies": allergies
            }
        }

        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Part.from_text(text=f"Analiza las condiciones del día:\n{json.dumps(prompt_payload, ensure_ascii=False)}")
            ],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.3
            )
        )

        data = json.loads(response.text)
        summary = data.get("summary", "")
        tips = data.get("tips", [])

        # Validación de alergias sobre el texto generado (RNF-16)
        forbidden = [a.lower().strip() for a in allergies if a.strip()]
        validated_tips = []
        for tip in tips:
            if not any(f in tip.lower() for f in forbidden):
                validated_tips.append(tip)

        if summary and len(validated_tips) >= 2:
            return summary, validated_tips[:3]

    except Exception as e:
        logger.warning(f"Error generando recomendaciones con Gemini, usando fallback determinístico: {e}")

    return _generate_fallback_ai_recommendations(
        skin_type,
        weather_data["humidity"],
        weather_data["uv"],
        weather_data["aqi"],
        weather_data["temp"],
        allergies
    )


def get_user_profile_context(user_id: Optional[str]) -> Dict[str, Any]:
    """Obtiene el contexto de piel del usuario para alimentar las recomendaciones de IA."""
    if not user_id:
        return {
            "skin_type": "Mixta",
            "sensitivity_level": "Media",
            "goals": ["Hidratación", "Protección Solar"],
            "allergies": []
        }

    try:
        from app.modules.perfil_salud.models import UserProfile, UserRestriction
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        restrictions = UserRestriction.query.filter_by(user_id=user_id).all()

        skin_type = (profile.skin_type if profile and profile.skin_type else "Mixta").capitalize()
        sensitivity = profile.sensitivity_level if profile and profile.sensitivity_level else "Media"
        goals = profile.goals if profile and profile.goals else ["Hidratación", "Protección"]
        allergies = [
            getattr(r, "name", "") or getattr(r, "ingredient_name", "")
            for r in restrictions
            if (getattr(r, "name", "") or getattr(r, "ingredient_name", ""))
        ]

        return {
            "skin_type": skin_type,
            "sensitivity_level": sensitivity,
            "goals": goals,
            "allergies": allergies
        }
    except Exception as e:
        logger.warning(f"No se pudo cargar el perfil para recomendaciones ambientales: {e}")
        return {
            "skin_type": "Mixta",
            "sensitivity_level": "Media",
            "goals": ["Hidratación", "Protección"],
            "allergies": []
        }


def get_or_create_user_preferences(user_id: str) -> UserEnvironmentalPreference:
    """Obtiene o inicializa las preferencias ambientales de un usuario."""
    pref = UserEnvironmentalPreference.query.filter_by(user_id=user_id).first()
    if not pref:
        # Intentar obtener la ciudad si ya la tenía en user_profiles
        manual_city = "León, Gto"
        use_loc = False
        try:
            from app.modules.perfil_salud.models import UserProfile
            up = UserProfile.query.filter_by(user_id=user_id).first()
            if up and up.manual_city:
                manual_city = up.manual_city
            if up and up.use_location is not None:
                use_loc = up.use_location
        except Exception:
            pass

        pref = UserEnvironmentalPreference(
            user_id=user_id,
            use_location=use_loc,
            city_name=manual_city,
            sync_with_routine=True
        )
        db.session.add(pref)
        db.session.commit()
    return pref


def get_environmental_data(
    city_name: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    user_id: Optional[str] = None,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Función central del Monitoreo Ambiental:
    1. Resuelve ciudad y coordenadas (RF-AMB-01, RF-AMB-02).
    2. Consulta caché en BD (RF-AMB-11). Si es válido y no se pide force_refresh, lo devuelve de inmediato.
    3. Si está expirado o no existe, consulta APIs meteorológicas (RF-AMB-03 al RF-AMB-07).
    4. Genera recomendaciones contextuales de IA (RF-AMB-08).
    5. Detecta alertas por radiación UV elevada (RF-AMB-09).
    6. Persiste en base de datos con TTL.
    7. Si la API falla, aplica fallback transparente para no romper la app (RF-AMB-12, RNF-26).
    """
    target_city = city_name or "León, Gto"
    target_lat = lat
    target_lon = lon

    # Si no se proveyeron coordenadas, resolverlas
    if target_lat is None or target_lon is None:
        target_lat, target_lon, resolved_name = resolve_coordinates_for_city(target_city)
        if resolved_name:
            target_city = resolved_name

    now_utc = datetime.now(timezone.utc)

    # 1. Verificar si existe snapshot en caché que no haya expirado (RF-AMB-11)
    if not force_refresh:
        cached_snapshot = EnvironmentalSnapshot.query.filter(
            EnvironmentalSnapshot.city_name == target_city,
            EnvironmentalSnapshot.expires_at > now_utc
        ).order_by(EnvironmentalSnapshot.recorded_at.desc()).first()

        if cached_snapshot:
            result = cached_snapshot.to_dict()
            result["fromCache"] = True
            return result

    # 2. Intentar consultar API externa
    user_context = get_user_profile_context(user_id)
    weather_dict = None
    is_fallback = False

    try:
        weather_dict = fetch_external_weather(target_lat, target_lon)
    except Exception as e:
        logger.error(f"Error consultando proveedor externo de clima: {e}")
        is_fallback = True

    # 3. Si falló la API externa, buscar el snapshot más reciente guardado o el mock regional (RF-AMB-12)
    if is_fallback or not weather_dict:
        last_saved = EnvironmentalSnapshot.query.filter_by(city_name=target_city).order_by(
            EnvironmentalSnapshot.recorded_at.desc()
        ).first()

        if last_saved:
            result = last_saved.to_dict()
            result["isFallback"] = True
            result["fromCache"] = True
            return result

        mock = FALLBACK_MOCK_DATA.get(target_city) or FALLBACK_MOCK_DATA["León, Gto"]
        weather_dict = {
            "temp": mock["temp"],
            "feelsLike": mock["feelsLike"],
            "condition": mock["condition"],
            "humidity": mock["humidity"],
            "humidityStatus": mock["humidityStatus"],
            "uv": mock["uv"],
            "uvLevel": mock["uvLevel"],
            "isHighUv": mock["isHighUv"],
            "aqi": mock["aqi"],
            "aqiStatus": mock["aqiStatus"],
            "windSpeed": mock["windSpeed"],
            "provider": "offline-fallback"
        }
        ai_summary = mock["aiSummary"]
        ai_tips = mock["aiTips"]
    else:
        # 4. Generar recomendaciones IA con contexto del usuario (RF-AMB-08)
        ai_summary, ai_tips = generate_contextual_ai_recommendations(
            target_city,
            weather_dict,
            user_context
        )

    # 5. Persistir nuevo snapshot en la base de datos con expiración
    expires_at = now_utc + timedelta(minutes=CACHE_TTL_MINUTES)
    snapshot = EnvironmentalSnapshot(
        city_name=target_city,
        latitude=target_lat,
        longitude=target_lon,
        temperature=weather_dict["temp"],
        feels_like=weather_dict["feelsLike"],
        condition=weather_dict["condition"],
        humidity=weather_dict["humidity"],
        humidity_status=weather_dict["humidityStatus"],
        uv_index=weather_dict["uv"],
        uv_level=weather_dict["uvLevel"],
        is_high_uv=weather_dict["isHighUv"],
        air_quality_index=weather_dict["aqi"],
        air_quality_status=weather_dict["aqiStatus"],
        wind_speed=weather_dict.get("windSpeed", 10.0),
        ai_summary=ai_summary,
        ai_tips=ai_tips,
        provider=weather_dict.get("provider", "open-meteo"),
        is_fallback=is_fallback,
        recorded_at=now_utc,
        expires_at=expires_at
    )

    try:
        db.session.add(snapshot)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error guardando EnvironmentalSnapshot: {e}")

    result = snapshot.to_dict()
    result["fromCache"] = False
    return result


def get_environmental_routine_context(user_id: str) -> Dict[str, Any]:
    """
    Provee el contexto ambiental estructurado para el Creador de Rutinas (RF-AMB-10).
    Permite que el motor de rutinas sepa si la radiación UV es extrema, si el clima es seco
    o si hay alta contaminación para adaptar texturas y pasos.
    """
    pref = UserEnvironmentalPreference.query.filter_by(user_id=user_id).first()
    city_name = pref.city_name if pref else "León, Gto"
    sync_enabled = pref.sync_with_routine if pref else True

    if not sync_enabled:
        return {
            "sync_enabled": False,
            "city": city_name,
            "summary": "Sincronización climática desactivada por el usuario.",
            "adjustments": []
        }

    env_data = get_environmental_data(
        city_name=city_name,
        lat=pref.latitude if pref else None,
        lon=pref.longitude if pref else None,
        user_id=user_id,
        force_refresh=False
    )

    adjustments = []
    if env_data.get("isHighUv"):
        adjustments.append({
            "type": "uv_alert",
            "category": "Fotoprotección",
            "message": f"Índice UV {env_data.get('uv')} ({env_data.get('uvLevel')}): Indispensable FPS 50+ y reaplicación frecuente."
        })

    humidity = env_data.get("humidity", 50)
    if humidity < 35:
        adjustments.append({
            "type": "low_humidity",
            "category": "Hidratación",
            "message": "Humedad baja: Refuerza la hidratación con ácido hialurónico y crema oclusiva de barrera."
        })
    elif humidity > 65:
        adjustments.append({
            "type": "high_humidity",
            "category": "Textura Ligera",
            "message": "Humedad alta: Prioriza fórmulas en gel ligeras no comedogénicas."
        })

    if env_data.get("aqi", 0) > 60:
        adjustments.append({
            "type": "high_pollution",
            "category": "Antioxidante & Limpieza",
            "message": "Contaminación moderada-alta: Añade antioxidantes por la mañana y doble limpieza nocturna."
        })

    return {
        "sync_enabled": True,
        "city": city_name,
        "temperature": env_data.get("temp"),
        "humidity": humidity,
        "uv_index": env_data.get("uv"),
        "uv_level": env_data.get("uvLevel"),
        "is_high_uv": env_data.get("isHighUv"),
        "condition": env_data.get("condition"),
        "summary": f"Condición en {city_name}: {env_data.get('condition')}, {env_data.get('temp')}°C, UV {env_data.get('uv')}, Humedad {humidity}%.",
        "adjustments": adjustments
    }
