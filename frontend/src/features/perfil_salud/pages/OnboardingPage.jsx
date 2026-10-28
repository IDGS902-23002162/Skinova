import React from "react";
import "../components/onboarding/Onboarding.css";
import ProgressDots from "../../../shared/components/ProgressDots";
import WavyBackground from "../../../shared/components/WavyBackground";
import { useFlujoOnboarding } from "../hooks/useFlujoOnboarding";
import BienvenidaStep from "../components/onboarding/steps/BienvenidaStep";
import NombreStep from "../components/onboarding/steps/NombreStep";
import PielStep from "../components/onboarding/steps/PielStep";
import RestriccionesStep from "../components/onboarding/steps/RestriccionesStep";
import PreferenciasStep from "../components/onboarding/steps/PreferenciasStep";

export default function OnboardingPage({ onComplete }) {
  const {
    currentStep,
    totalSteps,
    formData,
    isSubmitting,
    handleNext,
    handleBack,
    updateData,
    submitOnboarding
  } = useFlujoOnboarding({ onComplete });

  return (
    <div className="onboarding-wrapper">
      <WavyBackground />
      <div className="onboarding-card">

        {currentStep <= totalSteps && (
          <ProgressDots currentStep={currentStep} totalSteps={totalSteps} />
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          {currentStep === 1 && <BienvenidaStep onNext={handleNext} />}
          {currentStep === 2 && <NombreStep formData={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />}
          {currentStep === 3 && <PielStep formData={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />}
          {currentStep === 4 && <RestriccionesStep formData={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />}
          {currentStep === 5 && <PreferenciasStep formData={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />}
          {currentStep > 5 && (
            <div style={{ textAlign: "center" }}>
              <h2>✓ Todo listo, {formData.preferred_name}</h2>
              <p>Ya tenemos lo necesario para comenzar a personalizar tu experiencia.</p>
              <button
                onClick={submitOnboarding}
                disabled={isSubmitting}
                style={{
                  background: "var(--bosque-profundo, #163B35)",
                  color: "var(--crema, #F6F3EC)",
                  border: "none",
                  padding: "14px 24px",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  cursor: "pointer",
                  marginTop: "2rem"
                }}>
                {isSubmitting ? "Entrando..." : "Entrar a SKINOVA"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Alias para mantener compatibilidad
export const OnboardingContainer = OnboardingPage;
