import requests
from datetime import datetime, timedelta
from app.extensions import db
from app.modules.monitoreo_ambiental.models import (
    UserEnvironmentalPreference,
    EnvironmentalSnapshot,
)

DEFAULT_CITIES_COORDINATES = {
    "León, Guanajuato": {"label": "León, Guanajuato, México", "lat": 21.1253, "lon": -101.6713},
    "Guadalajara, Jalisco": {"label": "Guadalajara, Jalisco, México", "lat": 20.6597, "lon": -103.3496},
    "Tampico, Tamaulipas": {"label": "Tampico, Tamaulipas, México", "lat": 22.2553, "lon": -97.8686},
    "Ciudad de México": {"label": "Ciudad de México, México", "lat": 19.4326, "lon": -99.1332},
    "Monterrey, Nuevo León": {"label": "Monterrey, Nuevo León, México", "lat": 25.6866, "lon": -100.3161},
}

WEATHER_CODES_ES = {
    0: "Despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Neblina",
    48: "Niebla",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia fuerte",
    80: "Chubascos ligeros",
    95: "Tormenta eléctrica",
}


def get_or_create_user_preferences(user_id):
    prefs = UserEnvironmentalPreference.query.filter_by(user_id=user_id).first()
    if not prefs:
        prefs = UserEnvironmentalPreference(
            user_id=user_id,
            use_location=False,
            city_name="León, Guanajuato",
            latitude=21.1253,
            longitude=-101.6713,
            sync_with_routine=True,
        )
        db.session.add(prefs)
        db.session.commit()
    return prefs


def search_cities_predictive(query, limit=6):
    """Busca múltiples ciudades coincidentes en Open-Meteo Geocoding (gratis, sin API Key)."""
    clean_q = (query or "").strip()
    if len(clean_q) < 2:
        return []

    try:
        resp = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={
                "name": clean_q,
                "count": limit,
                "language": "es",
                "format": "json",
            },
            timeout=5,
        )
        if resp.status_code != 200:
            return []

        results = resp.json().get("results") or []
        cities = []
        seen_labels = set()

        for item in results:
            name = item.get("name", "").strip()
            admin1 = (item.get("admin1") or "").strip()
            country = (item.get("country") or "").strip()

            parts = [p for p in [name, admin1, country] if p]
            # Evitar repeticiones como "Ciudad de México, Ciudad de México, México"
            dedup_parts = []
            for p in parts:
                if not dedup_parts or dedup_parts[-1].lower() != p.lower():
                    dedup_parts.append(p)

            label = ", ".join(dedup_parts)
            if not label or label.lower() in seen_labels:
                continue
            seen_labels.add(label.lower())

            cities.append({
                "name": f"{name}, {admin1}".strip(", ") if admin1 and admin1.lower() != name.lower() else name,
                "label": label,
                "lat": item["latitude"],
                "lon": item["longitude"],
            })

        return cities
    except Exception as e:
        print(f"[Geocoding Error]: {e}")
        return []


def resolve_coordinates_for_city(city_name):
    """Resuelve (lat, lon, nombre_limpio) para una ciudad dada."""
    matches = search_cities_predictive(city_name, limit=1)
    if matches:
        top = matches[0]
        return top["lat"], top["lon"], top["name"]

    for key, info in DEFAULT_CITIES_COORDINATES.items():
        if city_name.lower() in key.lower():
            return info["lat"], info["lon"], key

    raise ValueError(f"No se encontró la ciudad '{city_name}'")


def reverse_geocode_coords(lat, lon):
    """Convierte coordenadas GPS (lat, lon) en el nombre real de la ciudad sin API Key."""
    try:
        resp = requests.get(
            "https://api.bigdatacloud.net/data/reverse-geocode-client",
            params={
                "latitude": lat,
                "longitude": lon,
                "localityLanguage": "es",
            },
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            city = (data.get("city") or data.get("locality") or "").strip()
            state = (data.get("principalSubdivision") or "").strip()
            if city:
                if state and state.lower() != city.lower():
                    return f"{city}, {state}"
                return city
    except Exception as e:
        print(f"[Reverse Geocoding Error]: {e}")

    return "Ubicación GPS actual"


def _build_dermatological_advice(city_name, temp, humidity, uv, uv_level, aqi, aqi_status):
    """
    Motor determinístico instantáneo de recomendaciones cutáneas (sin consumir cuota de Gemini).
    """
    tips = []
    summary_reasons = []

    # Reglas por Índice UV
    if uv >= 8:
        summary_reasons.append(f"radiación UV {uv_level.lower()} ({uv})")
        tips.append("Aplica protector solar FPS 50+ de amplio espectro y reaplica cada 2 horas al exterior.")
    elif uv >= 3:
        summary_reasons.append(f"índice UV {uv_level.lower()} ({uv})")
        tips.append("Usa protector solar FPS 50+ como paso final de tu rutina matutina.")
    else:
        tips.append("Aunque la radiación UV actual es baja, mantén tu protector solar diario por la mañana.")

    # Reglas por Humedad y Temperatura
    if humidity < 35:
        summary_reasons.append(f"baja humedad ({humidity}%)")
        tips.append("Ambiente seco: aplica sérum de Ácido Hialurónico sobre piel húmeda y sella con ceramidas.")
    elif humidity > 68 or temp >= 30:
        summary_reasons.append(f"calor/humedad ({temp}°C, {humidity}%)")
        tips.append("Prioriza hidratantes en gel ligero o emulsiones oil-free para evitar congestión de poros.")
    elif temp <= 14:
        summary_reasons.append(f"clima frío ({temp}°C)")
        tips.append("El aire fresco puede sensibilizar la barrera cutánea; usa un limpiador suave sin sulfatos.")
    else:
        tips.append("Condiciones de temperatura y humedad equilibradas para mantener tu rutina habitual.")

    # Reglas por Calidad del Aire (ICA)
    if aqi > 75:
        summary_reasons.append(f"calidad del aire {aqi_status.lower()} ({aqi} ICA)")
        tips.append("Incluye antioxidantes (Vitamina C o Niacinamida) y realiza doble limpieza por la noche.")
    else:
        tips.append("Realiza una limpieza facial suave por la noche para retirar protector solar e impurezas.")

    if summary_reasons:
        joined = " y ".join(summary_reasons[:2])
        ai_summary = (
            f"En {city_name} se registra {joined}, factores que influyen directamente "
            f"en la hidratación y defensa antioxidante de tu piel hoy."
        )
    else:
        ai_summary = (
            f"El clima actual en {city_name} ({temp}°C, humedad del {humidity}%) es favorable "
            f"para mantener tu barrera cutánea estable."
        )

    return ai_summary, tips[:3]


def get_environmental_data(city_name=None, lat=None, lon=None, user_id=None, force_refresh=False):
    resolved_city = (city_name or "").strip()

    # 1. Si llegaron coordenadas GPS sin nombre de ciudad válido, resolver por geocodificación inversa
    if lat is not None and lon is not None:
        if not resolved_city or resolved_city.lower().startswith("wakanda"):
            resolved_city = reverse_geocode_coords(lat, lon)
    else:
        if not resolved_city or resolved_city.lower().startswith("wakanda"):
            resolved_city = "León, Guanajuato"
        lat, lon, resolved_city = resolve_coordinates_for_city(resolved_city)

    # 2. Consultar clima actual en Open-Meteo (Temperatura, Humedad, UV)
    weather_resp = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,uv_index,weather_code",
            "timezone": "auto",
        },
        timeout=6,
    )
    weather_resp.raise_for_status()
    curr = weather_resp.json().get("current") or {}

    temp = round(float(curr.get("temperature_2m", 24)))
    feels_like = round(float(curr.get("apparent_temperature", temp)))
    humidity = round(float(curr.get("relative_humidity_2m", 45)))
    raw_uv = curr.get("uv_index")
    uv = round(float(raw_uv), 1) if raw_uv is not None else 0.0
    weather_code = int(curr.get("weather_code", 0))
    condition = WEATHER_CODES_ES.get(weather_code, "Condiciones estables")

    # 3. Consultar Calidad del Aire en Open-Meteo Air Quality
    aqi = 38
    try:
        aq_resp = requests.get(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "us_aqi",
            },
            timeout=5,
        )
        if aq_resp.status_code == 200:
            raw_aqi = (aq_resp.json().get("current") or {}).get("us_aqi")
            if raw_aqi is not None:
                aqi = round(float(raw_aqi))
    except Exception:
        pass

    uv_level = (
        "Bajo" if uv < 3
        else "Moderado" if uv < 6
        else "Alto" if uv < 8
        else "Muy Alto" if uv < 11
        else "Extremo"
    )
    humidity_status = (
        "Baja (Ambiente seco)" if humidity < 35
        else "Alta" if humidity > 68
        else "Óptima"
    )
    aqi_status = (
        "Buena" if aqi <= 50
        else "Moderada" if aqi <= 100
        else "Sensible / Mala"
    )

    ai_summary, ai_tips = _build_dermatological_advice(
        resolved_city, temp, humidity, uv, uv_level, aqi, aqi_status
    )

    # Guardar snapshot opcional en MySQL sin interrumpir si hay cambios de esquema
    if user_id:
        try:
            snap = EnvironmentalSnapshot(
                user_id=user_id,
                city_name=resolved_city,
                latitude=lat,
                longitude=lon,
                temperature=temp,
                feels_like=feels_like,
                humidity=humidity,
                uv_index=uv,
                air_quality_index=aqi,
                condition_text=condition,
                ai_summary=ai_summary,
                ai_tips=ai_tips,
            )
            db.session.add(snap)
            db.session.commit()
        except Exception:
            db.session.rollback()

    return {
        "city": resolved_city,
        "lat": lat,
        "lon": lon,
        "temp": temp,
        "feelsLike": feels_like,
        "condition": condition,
        "humidity": humidity,
        "humidityStatus": humidity_status,
        "uv": uv,
        "uvLevel": uv_level,
        "aqi": aqi,
        "aqiStatus": aqi_status,
        "aiSummary": ai_summary,
        "aiTips": ai_tips,
        "updatedAt": datetime.utcnow().isoformat() + "Z",
    }


def get_environmental_routine_context(user_id):
    prefs = get_or_create_user_preferences(user_id)
    if not prefs.sync_with_routine:
        return {"enabled": False}
    try:
        data = get_environmental_data(
            city_name=prefs.city_name,
            lat=prefs.latitude,
            lon=prefs.longitude,
            user_id=user_id,
        )
        return {"enabled": True, **data}
    except Exception:
        return {"enabled": False}