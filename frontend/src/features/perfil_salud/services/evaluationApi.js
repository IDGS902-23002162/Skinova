// src/features/perfil_salud/services/evaluationApi.js
export const createEvaluationApi = (fetchConAuth) => ({
  getEvaluations: async () => {
    return await fetchConAuth('/perfil-salud/evaluations');
  },
  getLatestEvaluation: async () => {
    return await fetchConAuth('/perfil-salud/evaluations/latest');
  },
  getEvaluation: async (id) => {
    return await fetchConAuth(`/perfil-salud/evaluations/${id}`);
  },
  /**
   * Realiza un análisis de piel con IA (Gemini).
   * @param {Object} params
   * @param {string} [params.imageBase64] - Imagen en Base64.
   * @param {string} [params.imageMimeType] - Tipo MIME (por defecto 'image/jpeg').
   * @param {string} [params.userDescription] - Sensaciones o síntomas descritos.
   * @param {boolean} [params.applyToProfile] - Si se debe actualizar el perfil del usuario.
   * @param {boolean} [params.isOnboarding] - Si el análisis se realiza durante el onboarding.
   */
  analyzeSkin: async ({ imageBase64, imageMimeType = "image/jpeg", userDescription, applyToProfile = false, isOnboarding = false } = {}) => {
    const payload = {};
    if (imageBase64) {
      payload.image_base64 = imageBase64;
      payload.image_mime_type = imageMimeType;
    }
    if (userDescription && typeof userDescription === 'string' && userDescription.trim()) {
      payload.user_description = userDescription.trim();
    }
    if (applyToProfile) {
      payload.apply_to_profile = true;
    }
    if (isOnboarding) {
      payload.is_onboarding = true;
    }

    const response = await fetchConAuth('/perfil-salud/evaluations/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || result.error || `Error en análisis de piel (${response.status})`);
    }

    return result.data || result;
  },
  // Mock function for frontend testing
  createMockEvaluation: async () => {
    return await fetchConAuth('/perfil-salud/evaluations', {
      method: 'POST',
      body: JSON.stringify({
        metrics: {
          oiliness: { score: 78, level: "high", explanation: "Se observa una presencia elevada de brillo en zona T." },
          dryness: { score: 25, level: "low", explanation: "No se observan signos importantes de descamación o resequedad." },
          sensitivity: { score: 72, level: "high", explanation: "Ligera tendencia al enrojecimiento al contacto." },
          redness: { score: 48, level: "moderate", explanation: "Presencia moderada de tono rojizo en mejillas." },
          texture: { score: 63, level: "moderate", explanation: "Textura irregular en algunas zonas específicas." },
          imperfections: { score: 55, level: "moderate", explanation: "Algunos poros dilatados y pequeñas imperfecciones visibles." }
        },
        summary: "Tu piel muestra una tendencia clara a la producción de sebo en la zona T, combinada con signos de sensibilidad en las mejillas. Es importante mantener un balance.",
        warnings: ["Evita usar exfoliantes físicos fuertes debido a la sensibilidad detectada."],
        requires_professional_attention: false,
        ai_provider: "mock",
        ai_model: "mock"
      })
    });
  }
});
