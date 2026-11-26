import { useState, useEffect, useCallback } from "react";

const DEFAULT_CONFIG = {
  plans: [
    { code: "free", name: "Gratuito", price: 0, features: "Consulta IA limitada · Rutinas básicas · Sin Neceser" },
    { code: "skinova_premium", name: "Premium", price: 149, features: "Consulta IA ilimitada · Todas las funciones · Prioridad" },
  ],
  features: {
    consulta_ia: true,
    comunidad: true,
    directorio: true,
    maintenance_mode: false,
    registration_enabled: true,
  },
};

export function useAppConfig(watchKey = "") {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const BASE_URL = import.meta.env.VITE_API_URL || "/api";

  const reloadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig({
          plans: data.plans?.length ? data.plans : DEFAULT_CONFIG.plans,
          features: { ...DEFAULT_CONFIG.features, ...(data.features || {}) },
        });
      }
    } catch {
      // ponytail: usa configuración por defecto si el servidor no responde
    }
  }, [BASE_URL]);

  useEffect(() => {
    reloadConfig();
  }, [reloadConfig, watchKey]);

  return { config, reloadConfig };
}

