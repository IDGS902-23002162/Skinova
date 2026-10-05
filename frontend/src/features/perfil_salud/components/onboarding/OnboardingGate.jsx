import React, { useEffect, useState } from "react";
import { useApi } from "../../../../shared/hooks/useApi";
import FullScreenLoader from "../../../../shared/components/FullScreenLoader";
import OnboardingContainer from "./OnboardingContainer";

export default function OnboardingGate({ children }) {
  const { fetchConAuth } = useApi();
  const [status, setStatus] = useState("loading"); // "loading" | "onboarding" | "completed"

  useEffect(() => {
    const syncAndCheckUser = async () => {
      try {
        const res = await fetchConAuth('/me');
        if (res.ok) {
          const data = await res.json();
          if (data.onboarding_completed) {
            setStatus("completed");
          } else {
            setStatus("onboarding");
          }
        } else {
          // Fallback en caso de error, podríamos reintentar o mostrar error,
          // por ahora dejaremos que pase si falla para no bloquear indefinidamente,
          // o idealmente mostrar un estado de error.
          setStatus("completed"); 
        }
      } catch (error) {
        console.error("Error comprobando el onboarding", error);
        setStatus("completed");
      }
    };
    
    syncAndCheckUser();
  }, []);

  if (status === "loading") {
    return <FullScreenLoader isVisible={true} text="Cargando entorno..." />;
  }

  if (status === "onboarding") {
    return <OnboardingContainer onComplete={() => setStatus("completed")} />;
  }

  return <>{children}</>;
}
