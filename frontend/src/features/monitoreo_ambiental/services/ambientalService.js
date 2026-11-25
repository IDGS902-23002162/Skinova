const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8002/api").replace(/\/$/, "");

async function authFetch(url, token, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Error al conectar con el servicio ambiental");
  }
  return response.json();
}

export const ambientalService = {
  /**
   * Obtiene las condiciones ambientales actuales para una ciudad o coordenadas (RF-AMB-03 al 09).
   */
  getCurrent: (token, { city, lat, lon, refresh = false } = {}) => {
    const params = new URLSearchParams();
    if (city) params.append("city", city);
    if (lat !== undefined && lat !== null) params.append("lat", lat);
    if (lon !== undefined && lon !== null) params.append("lon", lon);
    if (refresh) params.append("refresh", "true");

    const qs = params.toString();
    return authFetch(`/ambiente/current${qs ? `?${qs}` : ""}`, token);
  },

  /**
   * Obtiene las preferencias de ubicación y sincronización del usuario (RF-AMB-01, RF-AMB-02).
   */
  getPreferences: (token) => authFetch("/ambiente/preference", token),

  /**
   * Guarda o actualiza el consentimiento de ubicación y ciudad de referencia (RF-AMB-01, RF-AMB-02, RF-AMB-10).
   */
  updatePreferences: (token, payload) =>
    authFetch("/ambiente/preference", token, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  /**
   * Fuerza la actualización inmediata ignorando la caché (RF-AMB-11).
   */
  forceRefresh: (token, { city, lat, lon } = {}) =>
    authFetch("/ambiente/refresh", token, {
      method: "POST",
      body: JSON.stringify({ city, lat, lon }),
    }),

  /**
   * Consulta el catálogo de ciudades o busca por geocodificación (RF-AMB-02).
   */
  getCities: (token, query = "") => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    return authFetch(`/ambiente/cities${qs}`, token);
  },

  /**
   * Obtiene el contexto ambiental adaptado para el Creador de Rutinas (RF-AMB-10).
   */
  getRoutineContext: (token) => authFetch("/ambiente/routine-context", token),
};
