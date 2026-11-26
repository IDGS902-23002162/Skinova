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
    throw new Error(errorData.error || errorData.message || "Error al consultar el directorio de dermatólogos");
  }
  return response.json();
}

export const directorioService = {
  /**
   * Obtiene la lista de especialistas filtrados por proximidad, tipo de atención o búsqueda (RF-DER-01 al RF-DER-07).
   */
  getSpecialists: (token, { lat, lon, q, maxDistance, careType, onlyFavorites } = {}) => {
    const params = new URLSearchParams();
    if (lat !== undefined && lat !== null) params.append("lat", lat);
    if (lon !== undefined && lon !== null) params.append("lon", lon);
    if (q) params.append("q", q);
    if (maxDistance !== undefined && maxDistance !== null) params.append("max_distance", maxDistance);
    if (careType && careType !== "todos") params.append("care_type", careType);
    if (onlyFavorites) params.append("only_favorites", "true");

    const qs = params.toString();
    return authFetch(`/directorio/specialists${qs ? `?${qs}` : ""}`, token);
  },

  /**
   * Obtiene el detalle público completo de un especialista (RF-DER-05).
   */
  getSpecialistDetail: (token, doctorId) =>
    authFetch(`/directorio/specialists/${doctorId}`, token),

  /**
   * Obtiene los dermatólogos favoritos del usuario autenticado (RF-DER-11).
   */
  getFavorites: (token) =>
    authFetch("/directorio/favorites", token),

  /**
   * Alterna un dermatólogo como favorito (RF-DER-11).
   */
  toggleFavorite: (token, doctorId) =>
    authFetch(`/directorio/favorites/${doctorId}`, token, {
      method: "POST",
    }),

  /**
   * Elimina un dermatólogo de favoritos (RF-DER-11).
   */
  removeFavorite: (token, doctorId) =>
    authFetch(`/directorio/favorites/${doctorId}`, token, {
      method: "DELETE",
    }),

  /**
   * Comprueba si la IA derivó al usuario hacia consulta dermatológica médica (RF-DER-12).
   */
  getAiReferral: (token) =>
    authFetch("/directorio/ai-referral", token),
};
