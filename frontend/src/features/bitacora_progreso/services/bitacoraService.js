import { useApi } from "../../../shared/hooks/useApi";
import { useMemo } from "react";

/**
 * Servicio de conexión con el módulo de Bitácora y Hábitos (backend/app/modules/bitacora).
 * Proporciona métodos para registrar entradas faciales, fotos, hábitos diarios,
 * consultar el historial cronológico y gestionar recordatorios asociados (RF-NOT-01 a RF-NOT-15).
 */
export const createBitacoraApi = (fetchConAuth) => ({
  /**
   * Obtiene la línea de tiempo de registros de bitácora del usuario (con fotos y hábitos).
   */
  getEntries: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/bitacora/entries${query ? `?${query}` : ''}`;
    const response = await fetchConAuth(endpoint);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al obtener registros de la bitácora");
    }
    return data.data || [];
  },

  /**
   * Crea un nuevo registro en la bitácora.
   * @param {Object} payload { perception, notes, routine_id, photos: [string] }
   */
  createEntry: async ({ perception, notes, routine_id, photos = [] }) => {
    const response = await fetchConAuth('/bitacora/entries', {
      method: 'POST',
      body: JSON.stringify({
        perception: perception || 'same',
        notes: notes || null,
        routine_id: routine_id || null,
        photos: Array.isArray(photos) ? photos : (photos ? [photos] : []),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al guardar el registro");
    }
    return data.data;
  },

  /**
   * Elimina un registro de la bitácora.
   */
  deleteEntry: async (id) => {
    const response = await fetchConAuth(`/bitacora/entries/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al eliminar el registro");
    }
    return data;
  },

  /**
   * Elimina una foto específica de la bitácora.
   */
  deletePhoto: async (photoId) => {
    const response = await fetchConAuth(`/bitacora/photos/${photoId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al eliminar la fotografía");
    }
    return data;
  },

  /**
   * Registra los hábitos del día (agua, sueño, estrés, actividad, notas).
   */
  logHabits: async (habitData) => {
    const response = await fetchConAuth('/bitacora/habits', {
      method: 'POST',
      body: JSON.stringify(habitData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al guardar hábitos");
    }
    return data.data;
  },

  /**
   * Obtiene los hábitos de una fecha dada.
   */
  getHabits: async (logDate) => {
    const endpoint = logDate ? `/bitacora/habits?log_date=${logDate}` : '/bitacora/habits';
    const response = await fetchConAuth(endpoint);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al obtener hábitos");
    }
    return data.data;
  },

  /**
   * Obtiene las rutinas activas del usuario para asociarlas a las entradas.
   */
  getRoutines: async () => {
    const response = await fetchConAuth('/bitacora/routines');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al obtener rutinas");
    }
    return data.data || [];
  },

  /**
   * Evalúa y genera recordatorios automáticos (RF-NOT-01 a RF-NOT-10, incluyendo foto de progreso RF-NOT-07).
   */
  checkReminders: async () => {
    const response = await fetchConAuth('/bitacora/notifications/check', {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al evaluar recordatorios");
    }
    return data;
  },

  /**
   * Obtiene el historial de notificaciones dentro de la bitácora (RF-NOT-14).
   */
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/bitacora/notifications${query ? `?${query}` : ''}`;
    const response = await fetchConAuth(endpoint);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al obtener notificaciones");
    }
    return data;
  },

  /**
   * Obtiene la configuración de notificaciones (RF-NOT-11, RF-NOT-12, RF-NOT-13).
   */
  getSettings: async () => {
    const response = await fetchConAuth('/bitacora/notifications/settings');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al obtener configuración");
    }
    return data.data;
  },

  /**
   * Actualiza la configuración de notificaciones.
   */
  updateSettings: async (settings) => {
    const response = await fetchConAuth('/bitacora/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || "Error al actualizar configuración");
    }
    return data.data;
  },
});

export const useBitacoraApi = () => {
  const { fetchConAuth } = useApi();
  return useMemo(() => createBitacoraApi(fetchConAuth), [fetchConAuth]);
};
