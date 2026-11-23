import { useState, useEffect } from "react";
import { useApi } from "../../../shared/hooks/useApi";

const STORAGE_KEY = "skinova_onboarding_verified";

export function useVerificacionOnboarding() {
  const { fetchConAuth } = useApi();

  const [status, setStatus] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) === "true"
      ? "completed"
      : "loading";
  });

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      return;
    }

    let isMounted = true;

    const syncAndCheckUser = async () => {
      try {
        const res = await fetchConAuth('/me');
        if (res.ok) {
          const data = await res.json();
          if (data.onboarding_completed) {
            sessionStorage.setItem(STORAGE_KEY, "true");
            if (isMounted) setStatus("completed");
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
            if (isMounted) setStatus("onboarding");
          }
        } else {
          sessionStorage.setItem(STORAGE_KEY, "true");
          if (isMounted) setStatus("completed");
        }
      } catch (error) {
        console.error("Error comprobando el onboarding", error);
        sessionStorage.setItem(STORAGE_KEY, "true");
        if (isMounted) setStatus("completed");
      }
    };

    syncAndCheckUser();

    return () => {
      isMounted = false;
    };
  }, [fetchConAuth]);

  const markAsCompleted = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setStatus("completed");
  };

  return {
    status,
    markAsCompleted
  };
}
