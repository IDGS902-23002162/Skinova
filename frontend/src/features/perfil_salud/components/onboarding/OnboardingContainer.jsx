import React, { useState } from "react";
import "./Onboarding.css";
import ProgressDots from "../../../../shared/components/ProgressDots";
import WavyBackground from "../../../../shared/components/WavyBackground";
import { useApi } from "../../../../shared/hooks/useApi";
import BienvenidaStep from "./steps/BienvenidaStep";
import NombreStep from "./steps/NombreStep";
import PielStep from "./steps/PielStep";
import ObjetivosStep from "./steps/ObjetivosStep";
import RestriccionesStep from "./steps/RestriccionesStep";
import PreferenciasStep from "./steps/PreferenciasStep";

export default function OnboardingContainer({ onComplete }) {
  const { fetchConAuth } = useApi();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5;

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 4 || currentStep === 5) {
      handleNext();
    }
  };

  const updateData = (newData) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const submitOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetchConAuth('/onboarding', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        onComplete();
      } else {
        console.error("Error guardando el onboarding");
      }
    } catch (error) {
      console.error("Error de red", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
