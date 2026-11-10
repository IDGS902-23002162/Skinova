import { useCallback, useState } from 'react';
import { buildDefaultSettings } from '../config/notificationCategories';

export default function useNotificationSettings() {
  const [settings, setSettings] = useState(buildDefaultSettings);

  const setCategory = useCallback(
    (id, patch) =>
      setSettings((prev) => ({
        ...prev,
        categories: { ...prev.categories, [id]: { ...prev.categories[id], ...patch } },
      })),
    [],
  );

  const setQuietHours = useCallback(
    (patch) => setSettings((prev) => ({ ...prev, quietHours: { ...prev.quietHours, ...patch } })),
    [],
  );

  const setTimezone = useCallback(
    (timezone) => setSettings((prev) => ({ ...prev, timezone })),
    [],
  );

  return {
    settings,
    status: 'ready',
    saveState: 'idle',
    reload: () => {},
    setCategory,
    setQuietHours,
    setTimezone,
  };
}