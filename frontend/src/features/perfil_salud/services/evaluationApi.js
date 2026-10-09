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
