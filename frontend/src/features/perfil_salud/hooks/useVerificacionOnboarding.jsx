import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useApi } from "../../../shared/hooks/useApi";

export function useVerificacionOnboarding() {
  const { user, isLoaded } = useUser();
  const { fetchConAuth } = useApi();

  // Liga la llave al ID del usuario de Clerk para que cambiar de cuenta no herede el caché
  const storageKey = user?.id ? `skinova_onboarding_verified_${user.id}` : null;

  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!isLoaded) return;

    if (!user || !storageKey) {
      setStatus("completed");
      return;
    }

    if (sessionStorage.getItem(storageKey) === "true") {
      setStatus("completed");
      return;
    }

    let isMounted = true;

    const syncAndCheckUser = async () => {
      try {
        const res = await fetchConAuth('/me');
        if (res.ok) {
          const data = await res.json();
          if (data.subscription) {
            localStorage.setItem("skinova_subscription", JSON.stringify(data.subscription));
          } else {
            localStorage.setItem("skinova_subscription", JSON.stringify({ status: "free" }));
          }

          if (data.onboarding_completed) {
            sessionStorage.setItem(storageKey, "true");
            if (isMounted) setStatus("completed");
          } else {
            sessionStorage.removeItem(storageKey);
            if (isMounted) setStatus("onboarding");
          }
        } else {
          // No guardar en sessionStorage si hubo error para permitir reintentar al recargar
          if (isMounted) setStatus("onboarding");
        }
      } catch (error) {
        console.error("Error comprobando el onboarding", error);
        if (isMounted) setStatus("onboarding");
      }
    };

    syncAndCheckUser();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, user, storageKey, fetchConAuth]);

  const markAsCompleted = () => {
    if (storageKey) {
      sessionStorage.setItem(storageKey, "true");
    }
    setStatus("completed");
  };

  return {
    status,
    markAsCompleted
  };
}