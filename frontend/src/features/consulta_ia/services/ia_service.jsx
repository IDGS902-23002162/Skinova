import { useApi } from "../../../shared/hooks/useApi";

/**
 * Fabrica el servicio de consultas y análisis con IA.
 * @param {Function} fetchConAuth - Función para realizar peticiones HTTP autenticadas con Clerk.
 */
export const createIaService = (fetchConAuth) => ({
  /**
   * Envía un término de búsqueda, una imagen en base64 o ambos para su análisis por Gemini.
   * Conecta con backend: POST /api/products/analyze
   *
   * @param {Object} params
   * @param {string} [params.searchQuery] - Nombre o término de búsqueda del producto o ingrediente.
   * @param {string} [params.imageBase64] - Cadena base64 de la imagen del producto (opcional).
   * @param {string} [params.imageMimeType] - Tipo MIME de la imagen (por defecto image/jpeg).
   * @returns {Promise<Object>} Datos del análisis retornado por Gemini y la BD.
   */
  analyzeProduct: async ({ searchQuery, imageBase64, imageMimeType = "image/jpeg" }) => {
    const payload = {};
    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      payload.search_query = searchQuery.trim();
    }
    if (imageBase64) {
      payload.image_base64 = imageBase64;
      payload.image_mime_type = imageMimeType;
    }

    if (!payload.search_query && !payload.image_base64) {
      throw new Error("Debes proporcionar al menos un nombre de producto o una imagen para analizar.");
    }

    const response = await fetchConAuth("/products/analyze", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || result.error || `Error en el análisis (${response.status})`);
    }

    return result;
  },

  /**
   * Obtiene el historial de consultas de IA para el usuario autenticado.
   * Conecta con backend: GET /api/products/history
   *
   * @returns {Promise<Array>} Lista de consultas analizadas.
   */
  getHistory: async () => {
    const response = await fetchConAuth("/products/history", {
      method: "GET"
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || result.error || `Error al obtener historial (${response.status})`);
    }

    return result.data || [];
  },

  /**
   * Elimina una consulta del historial por su identificador.
   * Conecta con backend: DELETE /api/products/history/:id
   *
   * @param {string} historyId - ID de la consulta en ai_history.
   * @returns {Promise<Object>}
   */
  deleteHistoryItem: async (historyId) => {
    const response = await fetchConAuth(`/products/history/${historyId}`, {
      method: "DELETE"
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || result.error || `Error al eliminar consulta (${response.status})`);
    }

    return result;
  }
});

/**
 * Hook para usar el servicio de IA en componentes React.
 */
export function useIaService() {
  const { fetchConAuth } = useApi();
  return createIaService(fetchConAuth);
}

export default useIaService;
