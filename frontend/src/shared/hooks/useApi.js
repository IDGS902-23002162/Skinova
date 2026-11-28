import { useAuth } from "@clerk/react";
import { useCallback, useRef, useEffect } from "react";

export function useApi() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Uses environment variable or default fallback to python backend
  const BASE_URL = import.meta.env.VITE_API_URL || "/api";

  /**
   * Realiza una petición fetch autenticada agregando automáticamente el token JWT
   * @param {string} endpoint - La ruta de la API (ej: '/auth/me')
   * @param {object} opciones - Opciones de fetch (method, body, etc.)
   */
  const fetchConAuth = useCallback(
    async (endpoint, opciones = {}) => {
      // Obtiene el token actualizado de Clerk
      let token = await (getTokenRef.current?.() || getToken?.());
      if (!token && getToken) {
        token = await getToken({ skipCache: true });
      }

      // Asegura que el endpoint comience con '/' si no lo tiene
      const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

      return fetch(`${BASE_URL}${path}`, {
        ...opciones,
        headers: {
          ...opciones.headers,
          Authorization: `Bearer ${token}`,
          ...(!(opciones.body instanceof FormData) && { "Content-Type": "application/json" }),
        },
      });
    },
    [getToken, BASE_URL]
  );

  return { fetchConAuth };
}
