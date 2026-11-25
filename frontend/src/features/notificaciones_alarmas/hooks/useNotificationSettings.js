import { useCallback, useState, useEffect } from 'react';
import { buildDefaultSettings, mergeSettings } from '../config/notificationCategories';
import { useNotificationApi } from '../services/notificationService';
import { useAuth } from '@clerk/react';

export default function useNotificationSettings() {
  const { isSignedIn } = useAuth();
  const api = useNotificationApi();

  const [settings, setSettings] = useState(buildDefaultSettings);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'

  const fetchSettings = useCallback(async () => {
    if (!isSignedIn) {
      setSettings(buildDefaultSettings());
      setStatus('ready');
      return;
    }

    try {
      setStatus('loading');
      const data = await api.getSettings();
      if (data) {
        setSettings(mergeSettings(data));
      }
      setStatus('ready');
    } catch (err) {
      console.warn("No se pudo cargar la configuración de notificaciones del backend:", err);
      setSettings(buildDefaultSettings());
      setStatus('ready');
    }
  }, [isSignedIn]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const setCategory = useCallback(
    async (id, patch) => {
      setSettings((prev) => ({
        ...prev,
        categories: { ...prev.categories, [id]: { ...prev.categories[id], ...patch } },
      }));

      if (isSignedIn) {
        setSaveState('saving');
        try {
          await api.updateCategorySetting(id, patch);
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 1500);
        } catch (err) {
          console.error("Error al guardar categoría en backend:", err);
          setSaveState('idle');
        }
      }
    },
    [isSignedIn, api],
  );

  const setQuietHours = useCallback(
    async (patch) => {
      let updatedQh;
      setSettings((prev) => {
        updatedQh = { ...prev.quietHours, ...patch };
        return { ...prev, quietHours: updatedQh };
      });

      if (isSignedIn) {
        setSaveState('saving');
        try {
          await api.updateSettings({ quietHours: updatedQh });
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 1500);
        } catch (err) {
          console.error("Error al guardar horario silencioso en backend:", err);
          setSaveState('idle');
        }
      }
    },
    [isSignedIn, api],
  );

  const setTimezone = useCallback(
    async (timezone) => {
      setSettings((prev) => ({ ...prev, timezone }));

      if (isSignedIn) {
        setSaveState('saving');
        try {
          await api.updateSettings({ timezone });
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 1500);
        } catch (err) {
          console.error("Error al guardar zona horaria en backend:", err);
          setSaveState('idle');
        }
      }
    },
    [isSignedIn, api],
  );

  return {
    settings,
    status,
    saveState,
    reload: fetchSettings,
    setCategory,
    setQuietHours,
    setTimezone,
  };
}
