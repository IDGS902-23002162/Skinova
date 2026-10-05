import { useAuth } from "@clerk/react";

export function useApi() {
  const { getToken } = useAuth();

  // Uses environment variable or default fallback to python backend
  const BASE_URL = import.meta.env.VITE_API_URL || "/api";

  /**
   * Realiza una petición fetch autenticada agregando automáticamente el token JWT
   * @param {string} endpoint - La ruta de la API (ej: '/auth/me')
   * @param {object} opciones - Opciones de fetch (method, body, etc.)
   */
  const fetchConAuth = async (endpoint, opciones = {}) => {
    // Obtiene el token actualizado de Clerk
    const token = await getToken();

    // Asegura que el endpoint comience con '/' si no lo tiene
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return fetch(`${BASE_URL}${path}`, {
      ...opciones,
      headers: {
        ...opciones.headers,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
  };

  return { fetchConAuth };
}
