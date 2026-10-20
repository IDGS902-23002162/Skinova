import React, { useEffect, useState } from "react";
import { useApi } from "../../../../shared/hooks/useApi";
import FullScreenLoader from "../../../../shared/components/FullScreenLoader";
import OnboardingContainer from "./OnboardingContainer";

export default function OnboardingGate({ children }) {
  const { fetchConAuth } = useApi();
  
  // Si ya se verificó el onboarding en esta sesión, inicia directamente como "completed"
  const [status, setStatus] = useState(() => {
    return sessionStorage.getItem("skinova_onboarding_verified") === "true"
      ? "completed"
      : "loading";
  });

  useEffect(() => {
    // Si ya fue verificado como completado en esta sesión, no re-ejecutar ni bloquear la pantalla
    if (sessionStorage.getItem("skinova_onboarding_verified") === "true") {
      return;
    }

    let isMounted = true;

    const syncAndCheckUser = async () => {
      try {
        const res = await fetchConAuth('/me');
        if (res.ok) {
          const data = await res.json();
          if (data.onboarding_completed) {
            sessionStorage.setItem("skinova_onboarding_verified", "true");
            if (isMounted) setStatus("completed");
          } else {
            sessionStorage.removeItem("skinova_onboarding_verified");
            if (isMounted) setStatus("onboarding");
          }
        } else {
          sessionStorage.setItem("skinova_onboarding_verified", "true");
          if (isMounted) setStatus("completed"); 
        }
      } catch (error) {
        console.error("Error comprobando el onboarding", error);
        sessionStorage.setItem("skinova_onboarding_verified", "true");
        if (isMounted) setStatus("completed");
      }
    };
    
    syncAndCheckUser();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "loading") {
    return <FullScreenLoader isVisible={true} text="Cargando entorno..." />;
  }

  if (status === "onboarding") {
    return (
      <OnboardingContainer 
        onComplete={() => {
          sessionStorage.setItem("skinova_onboarding_verified", "true");
          setStatus("completed");
        }} 
      />
    );
  }

  return <>{children}</>;
}
