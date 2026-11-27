const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8002/api").replace(/\/$/, "");
const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const AIR_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

function normalizeArgs(arg1, arg2) {
  let token = null;
  let params = {};

  if (arg1 && typeof arg1 === "object") {
    params = arg1;
    token = typeof arg2 === "string" ? arg2 : null;
  } else if (typeof arg1 === "string") {
    if (arg2 && typeof arg2 === "object") {
      token = arg1;
      params = arg2;
    } else if (typeof arg2 === "string") {
      token = arg1;
      params = { city: arg2 };
    } else if (arg1.startsWith("eyJ")) {
      token = arg1;
    } else {
      params = { city: arg1 };
    }
  } else if (arg2 && typeof arg2 === "object") {
    params = arg2;
  }

  return { token, params };
}

function getUvLevel(uv) {
  if (uv >= 11) return "Extremo";
  if (uv >= 8) return "Muy Alto";
  if (uv >= 6) return "Alto";
  if (uv >= 3) return "Moderado";
  return "Bajo";
}

function getHumidityStatus(humidity) {
  if (humidity < 35) return "Baja (Ambiente seco)";
  if (humidity > 70) return "Alta (Ambiente húmedo)";
  return "Óptima";
}

function getAqiStatus(aqi) {
  if (aqi <= 50) return "Buena";
  if (aqi <= 100) return "Moderada";
  return "Mala (Alta polución)";
}

function buildGuidance(cityLabel, temp, humidity, uv, aqi) {
  const tips = [];

  if (uv >= 6) {
    tips.push("Aplica protector solar FPS 50+ como último paso matutino y reaplica cada 2 horas.");
  } else {
    tips.push("Mantén tu protector solar diario para prevenir fotoenvejecimiento acumulativo.");
  }

  if (humidity < 35) {
    tips.push("La humedad baja favorece la deshidratación: prioriza ácido hialurónico y ceramidas.");
  } else if (humidity > 70) {
    tips.push("Con humedad alta, prefiere hidratantes en gel ligero para no saturar los poros.");
  } else {
    tips.push("La humedad ambiental es equilibrada; mantén tu hidratante habitual.");
  }

  if (aqi > 75) {
    tips.push("Presencia moderada/alta de partículas en el aire: realiza doble limpieza por la noche.");
  } else if (temp >= 30) {
    tips.push("Temperatura elevada: utiliza limpiadores suaves que controlen el exceso de sebo.");
  } else {
    tips.push("Usa antioxidantes por la mañana para proteger la barrera cutánea durante el día.");
  }

  return {
    aiSummary: `En ${cityLabel} se registran ${temp}°C con ${humidity}% de humedad e índice UV ${uv}. Ajusta la hidratación y fotoprotección según estas condiciones reales.`,
    aiTips: tips,
  };
}

// Normaliza cualquier estructura que devuelva el backend de Flask
function normalizeBackendResponse(raw, requestedCity) {
  const src = raw?.data || raw?.environment || raw?.current || raw || {};

  const temp = Number(src.temp ?? src.temperature ?? src.temperature_2m ?? 24);
  const feelsLike = Number(src.feelsLike ?? src.feels_like ?? src.apparent_temperature ?? temp);
  const humidity = Math.round(Number(src.humidity ?? src.relative_humidity ?? 50));
  const uv = Number(src.uv ?? src.uvIndex ?? src.uv_index ?? 0);
  const aqi = Math.round(Number(src.aqi ?? src.us_aqi ?? src.air_quality ?? 35));
  const city = src.city || src.location || src.city_name || requestedCity || "Ciudad seleccionada";
  const condition = src.condition || src.weather_condition || src.description || "Despejado";

  const fallbackGuidance = buildGuidance(city, temp, humidity, uv, aqi);
  const aiSummary =
    src.aiSummary ||
    src.ai_summary ||
    src.recommendation_summary ||
    src.recommendations?.summary ||
    fallbackGuidance.aiSummary;

  const rawTips =
    src.aiTips ||
    src.ai_tips ||
    src.tips ||
    src.recommendations?.tips;

  const aiTips = Array.isArray(rawTips) && rawTips.length > 0 ? rawTips : fallbackGuidance.aiTips;

  return {
    city,
    temp,
    feelsLike,
    condition,
    humidity,
    humidityStatus: src.humidityStatus || src.humidity_status || getHumidityStatus(humidity),
    uv,
    uvLevel: src.uvLevel || src.uv_level || getUvLevel(uv),
    aqi,
    aqiStatus: src.aqiStatus || src.aqi_status || getAqiStatus(aqi),
    aiSummary,
    aiTips,
  };
}

function mapWeatherCode(code) {
  if (code === 0) return "Despejado";
  if ([1, 2, 3].includes(code)) return "Mayormente despejado";
  if ([45, 48].includes(code)) return "Con neblina";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Lluvioso";
  if ([71, 73, 75, 85, 86].includes(code)) return "Nieve";
  if ([95, 96, 99].includes(code)) return "Tormenta eléctrica";
  return "Parcialmente nublado";
}

async function fetchDirectRealWeather({ city, lat, lon }) {
  let targetLat = lat;
  let targetLon = lon;
  let resolvedLabel = city;

  if (targetLat == null || targetLon == null) {
    if (!city || !city.trim()) {
      const emptyErr = new Error("Ingresa el nombre de una ciudad.");
      emptyErr.code = "INVALID_CITY";
      throw emptyErr;
    }

    const geoRes = await fetch(
      `${GEO_API}?name=${encodeURIComponent(city.trim())}&count=1&language=es&format=json`
    );
    if (!geoRes.ok) throw new Error("No se pudo conectar con el servicio de geocodificación.");

    const geoJson = await geoRes.json();
    if (!geoJson.results || geoJson.results.length === 0) {
      const invalidErr = new Error(`No se encontró la ciudad "${city}". Ingresa una ciudad real.`);
      invalidErr.code = "INVALID_CITY";
      throw invalidErr;
    }

    const place = geoJson.results[0];
    targetLat = place.latitude;
    targetLon = place.longitude;
    resolvedLabel = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  }

  const [weatherRes, airRes] = await Promise.all([
    fetch(
      `${WEATHER_API}?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto`
    ),
    fetch(
      `${AIR_API}?latitude=${targetLat}&longitude=${targetLon}&current=us_aqi,uv_index`
    ),
  ]);

  if (!weatherRes.ok || !airRes.ok) {
    throw new Error("Error al consultar los datos climáticos en tiempo real.");
  }

  const weatherJson = await weatherRes.json();
  const airJson = await airRes.json();

  const temp = Number(weatherJson.current.temperature_2m.toFixed(1));
  const feelsLike = Number(weatherJson.current.apparent_temperature.toFixed(1));
  const humidity = Math.round(weatherJson.current.relative_humidity_2m);
  const condition = mapWeatherCode(weatherJson.current.weather_code);
  const uv = Number((airJson.current?.uv_index ?? 0).toFixed(1));
  const aqi = Math.round(airJson.current?.us_aqi ?? 32);

  return {
    city: resolvedLabel || "Mi ubicación (GPS)",
    temp,
    feelsLike,
    condition,
    humidity,
    humidityStatus: getHumidityStatus(humidity),
    uv,
    uvLevel: getUvLevel(uv),
    aqi,
    aqiStatus: getAqiStatus(aqi),
    ...buildGuidance(resolvedLabel || "Ubicación GPS", temp, humidity, uv, aqi),
  };
}

async function authFetch(url, token, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token && token !== "null" && token !== "undefined") {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.error || errorData.message || response.statusText);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

async function getCurrentHandler(arg1, arg2) {
  const { token, params } = normalizeArgs(arg1, arg2);
  const query = new URLSearchParams();
  if (params.city) query.set("city", params.city);
  if (params.lat != null && params.lon != null) {
    query.set("lat", params.lat);
    query.set("lon", params.lon);
  }

  try {
    const backendData = await authFetch(`/ambiente/current?${query.toString()}`, token);
    return normalizeBackendResponse(backendData, params.city);
  } catch (err) {
    if (err.status === 400 || err.status === 404) {
      const invalidErr = new Error(
        err.message || `No se encontró la ciudad "${params.city}". Ingresa una ciudad real.`
      );
      invalidErr.code = "INVALID_CITY";
      throw invalidErr;
    }

    return await fetchDirectRealWeather(params);
  }
}

export const ambientalService = {
  getCurrent: getCurrentHandler,
  getCurrentEnvironment: getCurrentHandler,
  async getCities(token) {
    try {
      return await authFetch("/ambiente/cities", token);
    } catch {
      return ["León, Gto", "Ciudad de México", "Monterrey, N.L.", "Guadalajara, Jal", "Tampico, Tamps"];
    }
  },
};