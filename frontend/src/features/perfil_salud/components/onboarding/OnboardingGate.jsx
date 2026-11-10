import React from "react";
import FullScreenLoader from "../../../../shared/components/FullScreenLoader";
import { useVerificacionOnboarding } from "../../hooks/useVerificacionOnboarding";
import OnboardingPage from "../../pages/OnboardingPage";

export default function OnboardingGate({ children }) {
  const { status, markAsCompleted } = useVerificacionOnboarding();

  if (status === "loading") {
    return <FullScreenLoader isVisible={true} text="Cargando entorno..." />;
  }

  if (status === "onboarding") {
    return (
      <OnboardingPage 
        onComplete={markAsCompleted} 
      />
    );
  }

  return <>{children}</>;
}
