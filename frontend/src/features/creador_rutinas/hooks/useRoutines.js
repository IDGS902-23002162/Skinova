import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { rutinasService } from "../services/rutinasService";

export function useRoutines() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [activeVersionId, setActiveVersionId] = useState(null);
  const [profileContext, setProfileContext] = useState({
    skinType: "Mixta",
    sensitivity: "Sensible",
    goals: ["Hidratación", "Luminosidad"],
    allergies: [],
  });
  const [done, setDone] = useState([]);
  const [budget, setBudget] = useState("medio");
  const [loading, setLoading] = useState(true);
  const [regeneratingStepId, setRegeneratingStepId] = useState(null);
  const [statusBanner, setStatusBanner] = useState("");

  const loadRoutines = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      setLoading(true);
      const token = await getToken();
      const data = await rutinasService.getRoutines(token);

      setVersions(data.versions || []);
      setActiveVersionId(data.activeVersionId);
      setSelectedVersionId(data.activeVersionId);
      setDone(data.completedToday || []);
      if (data.profileContext) {
        setProfileContext(data.profileContext);
      }
      const activeObj = (data.versions || []).find((v) => v.id === data.activeVersionId);
      if (activeObj?.budget) {
        setBudget(activeObj.budget);
      }
    } catch (err) {
      console.error("Error cargando rutinas:", err);
      setStatusBanner("No se pudieron cargar las rutinas desde el servidor.");
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const currentVersion =
    versions.find((v) => v.id === selectedVersionId) || versions[0] || null;

  const updateVersionInState = (updatedVersion) => {
    setVersions((prev) =>
      prev.map((v) => (v.id === updatedVersion.id ? updatedVersion : v))
    );
  };

  const toggleDone = async (stepId) => {
    // Actualización optimista en pantalla
    setDone((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
    try {
      const token = await getToken();
      await rutinasService.toggleCompleteStep(token, stepId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePauseProduct = async (stepId) => {
    try {
      const token = await getToken();
      const updatedStep = await rutinasService.togglePauseStep(token, stepId);
      setVersions((prev) =>
        prev.map((v) => {
          if (v.id !== selectedVersionId) return v;
          return {
            ...v,
            matutina: v.matutina.map((s) => (s.id === stepId ? updatedStep : s)),
            nocturna: v.nocturna.map((s) => (s.id === stepId ? updatedStep : s)),
          };
        })
      );
    } catch (err) {
      setStatusBanner("Error al actualizar la pausa del producto.");
    }
  };

  const handleReplaceStepProduct = async (stepId) => {
    try {
      setRegeneratingStepId(stepId);
      const token = await getToken();
      const updatedStep = await rutinasService.replaceStep(token, stepId, budget);
      setVersions((prev) =>
        prev.map((v) => {
          if (v.id !== selectedVersionId) return v;
          return {
            ...v,
            matutina: v.matutina.map((s) => (s.id === stepId ? updatedStep : s)),
            nocturna: v.nocturna.map((s) => (s.id === stepId ? updatedStep : s)),
          };
        })
      );
      setStatusBanner("Paso sustituido parcialmente por IA sin alterar el resto de tu rutina.");
    } catch (err) {
      setStatusBanner("Error al regenerar el paso.");
    } finally {
      setRegeneratingStepId(null);
    }
  };

  const handleAddStep = async (period) => {
    if (!currentVersion) return;
    try {
      const token = await getToken();
      const createdStep = await rutinasService.addStep(token, currentVersion.id, {
        period,
      });
      setVersions((prev) =>
        prev.map((v) => {
          if (v.id !== currentVersion.id) return v;
          return {
            ...v,
            [period]: [...v[period], createdStep],
          };
        })
      );
      setStatusBanner("Nuevo paso añadido y guardado en MySQL.");
    } catch (err) {
      setStatusBanner("No se pudo añadir el paso.");
    }
  };

  const handleSaveActiveRoutine = async () => {
    if (!currentVersion) return;
    try {
      const token = await getToken();
      await rutinasService.activateVersion(token, currentVersion.id);
      await loadRoutines();
      setStatusBanner("¡Rutina establecida como tu Rutina Activa en la base de datos!");
    } catch (err) {
      setStatusBanner("Error al activar esta versión de rutina.");
    }
  };

  const handleGenerateNewVersion = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      await rutinasService.generateNewVersion(token, budget);
      await loadRoutines();
      setStatusBanner("Nueva versión de rutina generada respetando tu perfil, presupuesto y alergias.");
    } catch (err) {
      setStatusBanner("Error al generar nueva versión.");
      setLoading(false);
    }
  };

  const handleApplySmartAdjustment = async () => {
    if (!currentVersion) return;
    try {
      const token = await getToken();
      const updatedVersion = await rutinasService.applySmartAdjustment(
        token,
        currentVersion.id
      );
      updateVersionInState(updatedVersion);
      setStatusBanner("Ajuste inteligente aplicado y guardado en tu rutina.");
    } catch (err) {
      setStatusBanner("Error al aplicar el ajuste inteligente.");
    }
  };

  return {
    versions,
    currentVersion,
    selectedVersionId,
    setSelectedVersionId,
    activeVersionId,
    profileContext,
    done,
    budget,
    setBudget,
    loading,
    regeneratingStepId,
    statusBanner,
    setStatusBanner,
    toggleDone,
    handleTogglePauseProduct,
    handleReplaceStepProduct,
    handleAddStep,
    handleSaveActiveRoutine,
    handleGenerateNewVersion,
    handleApplySmartAdjustment,
  };
}