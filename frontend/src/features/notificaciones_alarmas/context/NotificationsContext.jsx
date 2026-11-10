import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { MOCK_NOTIFICATIONS } from '../mocks/mockNotifications';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markAsRead = useCallback((id) => {
    const readAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: readAt } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: readAt })));
  }, []);

  // Se mantienen para no tocar los componentes cuando se conecte el backend.
  const refresh = useCallback(() => {}, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      status: 'ready',
      refresh,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, unreadCount, refresh, markAsRead, markAllAsRead],
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