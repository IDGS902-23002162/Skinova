import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { useBitacoraApi } from '../services/bitacoraService';

/**
 * Hook para la gestión del estado y datos de la Bitácora de Progreso y Hábitos.
 */
export function useBitacora() {
  const { isSignedIn, isLoaded } = useAuth();
  const api = useBitacoraApi();
  const apiRef = useRef(api);

  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const [entries, setEntries] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeReminder, setActiveReminder] = useState(null);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const currentApi = apiRef.current;
      const [entriesData, routinesData] = await Promise.all([
        currentApi.getEntries(),
        currentApi.getRoutines().catch(() => [
          { id: 'morning', name: 'Rutina Matutina' },
          { id: 'night', name: 'Rutina Nocturna' },
        ]),
      ]);

      setEntries(entriesData || []);
      setRoutines(routinesData || []);

      // Evaluar recordatorios en background (RF-NOT-07 foto de progreso, RF-NOT-04 semanal, etc.)
      currentApi.checkReminders().catch(() => {});

      // Consultar si hay una alerta pendiente para foto de progreso (RF-NOT-07)
      currentApi
        .getNotifications({ unread_only: 'true', category: 'progress_photo', limit: 1 })
        .then((res) => {
          if (res?.data && res.data.length > 0) {
            setActiveReminder(res.data[0]);
          }
        })
        .catch(() => {});
    } catch (err) {
      console.error('Error al cargar datos de bitácora:', err);
      setError(err.message || 'Error al conectar con la bitácora');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveRecord = async (payload) => {
    setSaving(true);
    setError(null);
    try {
      const currentApi = apiRef.current;
      const photo = payload.entry?.photo;
      const photos = photo ? [photo] : [];

      const newEntry = await currentApi.createEntry({
        perception: payload.entry?.perception || 'same',
        notes: payload.entry?.notes || null,
        routine_id: payload.entry?.routine_id || null,
        photos,
      });

      if (payload.habit_log) {
        await currentApi.logHabits(payload.habit_log);
      }

      // Recargar lista completa actualizada con relaciones enriquecidas
      const updatedEntries = await currentApi.getEntries();
      setEntries(updatedEntries);
      setActiveReminder(null);
      return newEntry;
    } catch (err) {
      console.error('Error al guardar registro en bitácora:', err);
      setError(err.message || 'Error al guardar el registro');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deletePhoto = async (photo) => {
    if (!photo?.id) return;
    try {
      const currentApi = apiRef.current;
      await currentApi.deletePhoto(photo.id);
      setEntries((prev) =>
        prev.map((e) => ({
          ...e,
          photos: (e.photos || []).filter((p) => p.id !== photo.id),
        }))
      );
    } catch (err) {
      console.error('Error al eliminar fotografía:', err);
      setError(err.message || 'Error al eliminar fotografía');
      throw err;
    }
  };

  const deleteEntry = async (entryId) => {
    if (!entryId) return;
    try {
      const currentApi = apiRef.current;
      await currentApi.deleteEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      console.error('Error al eliminar registro:', err);
      setError(err.message || 'Error al eliminar el registro');
      throw err;
    }
  };

  const dismissReminder = () => {
    setActiveReminder(null);
  };

  return {
    entries,
    routines,
    loading,
    saving,
    error,
    activeReminder,
    dismissReminder,
    saveRecord,
    deletePhoto,
    deleteEntry,
    refresh: loadData,
  };
}
