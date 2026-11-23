import { useApi } from "../../../shared/hooks/useApi";

export const createNotificationApi = (fetchConAuth) => ({
  /**
   * Obtiene la lista de notificaciones e información de no leídas (RF-NOT-14).
   */
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/notifications${query ? `?${query}` : ""}`;
    const response = await fetchConAuth(endpoint);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al obtener notificaciones");
    }
    return data;
  },

  /**
   * Marca una notificación específica como leída (RF-NOT-14).
   */
  markAsRead: async (id) => {
    const response = await fetchConAuth(`/notifications/${id}/read`, {
      method: "PATCH"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al marcar como leída");
    }
    return data;
  },

  /**
   * Marca todas las notificaciones pendientes como leídas (RF-NOT-14).
   */
  markAllAsRead: async () => {
    const response = await fetchConAuth("/notifications/mark-all-read", {
      method: "POST"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al marcar todas como leídas");
    }
    return data;
  },

  /**
   * Elimina una notificación del historial (RF-NOT-14).
   */
  deleteNotification: async (id) => {
    const response = await fetchConAuth(`/notifications/${id}`, {
      method: "DELETE"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al eliminar notificación");
    }
    return data;
  },

  /**
   * Elimina todas las notificaciones leídas (RF-NOT-14).
   */
  clearReadNotifications: async () => {
    const response = await fetchConAuth("/notifications/clear", {
      method: "DELETE"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al limpiar notificaciones");
    }
    return data;
  },

  /**
   * Obtiene la configuración de notificaciones del usuario (RF-NOT-11, RF-NOT-12, RF-NOT-13).
   */
  getSettings: async () => {
    const response = await fetchConAuth("/notifications/settings");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al obtener configuración");
    }
    return data.data;
  },

  /**
   * Actualiza la configuración global de notificaciones (RF-NOT-11, RF-NOT-12, RF-NOT-13).
   */
  updateSettings: async (settings) => {
    const response = await fetchConAuth("/notifications/settings", {
      method: "PUT",
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al actualizar configuración");
    }
    return data.data;
  },

  /**
   * Actualiza una categoría de notificación específica (RF-NOT-11).
   */
  updateCategorySetting: async (categoryId, patch) => {
    const response = await fetchConAuth(`/notifications/settings/category/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al actualizar categoría");
    }
    return data.data;
  },

  /**
   * Ejecuta la evaluación automática de recordatorios pendientes en el backend.
   */
  checkReminders: async () => {
    const response = await fetchConAuth("/notifications/check-reminders", {
      method: "POST"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Error al evaluar recordatorios");
    }
    return data;
  }
});

export function useNotificationApi() {
  const { fetchConAuth } = useApi();
  return createNotificationApi(fetchConAuth);
}

export default useNotificationApi;
