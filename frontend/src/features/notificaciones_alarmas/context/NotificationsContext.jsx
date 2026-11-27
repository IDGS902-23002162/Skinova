import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { MOCK_NOTIFICATIONS } from '../mocks/mockNotifications';
import { useNotificationApi } from '../services/notificationService';
import { useAuth } from '@clerk/react';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { isSignedIn } = useAuth();
  const api = useNotificationApi();

  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  const fetchNotifications = useCallback(async () => {
    if (!isSignedIn) {
      setNotifications(MOCK_NOTIFICATIONS);
      setStatus('ready');
      return;
    }

    try {
      setStatus('loading');
      // Primero evaluar recordatorios pendientes en backend si corresponde
      try {
        await api.checkReminders();
      } catch (err) {
        // Silencioso si falla check-reminders
      }

      const res = await api.getNotifications();
      if (res && res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else {
        setNotifications(MOCK_NOTIFICATIONS);
      }
      setStatus('ready');
    } catch (err) {
      console.warn("No se pudieron cargar notificaciones del backend, usando datos locales:", err);
      setNotifications(MOCK_NOTIFICATIONS);
      setStatus('ready');
    }
  }, [isSignedIn]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    const readAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: readAt } : n)),
    );

    if (isSignedIn) {
      try {
        await api.markAsRead(id);
      } catch (err) {
        console.error("Error al marcar como leída en backend:", err);
      }
    }
  }, [isSignedIn, api]);

  const markAllAsRead = useCallback(async () => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: readAt })));

    if (isSignedIn) {
      try {
        await api.markAllAsRead();
      } catch (err) {
        console.error("Error al marcar todas como leídas en backend:", err);
      }
    }
  }, [isSignedIn, api]);

  const deleteNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (isSignedIn) {
      try {
        await api.deleteNotification(id);
      } catch (err) {
        console.error("Error al eliminar notificación en backend:", err);
      }
    }
  }, [isSignedIn, api]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      status,
      refresh: fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
    }),
    [notifications, unreadCount, status, fetchNotifications, markAsRead, markAllAsRead, deleteNotification],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>');
  }
  return context;
}

export default NotificationsContext;
