import { useState } from "react";
import { useApi } from "../../../shared/hooks/useApi";

export function useFlujoOnboarding({ onComplete } = {}) {
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
        if (onComplete) onComplete();
      } else {
        console.error("Error guardando el onboarding");
      }
    } catch (error) {
      console.error("Error de red", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    currentStep,
    totalSteps,
    formData,
    isSubmitting,
    handleNext,
    handleBack,
    handleSkip,
    updateData,
    submitOnboarding
  };
}
