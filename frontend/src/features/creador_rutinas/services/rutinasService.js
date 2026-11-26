const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8002/api").replace(/\/$/, "");

async function authFetch(url, token, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Error en la comunicación con el servidor");
  }
  return response.json();
}

export const rutinasService = {
  getRoutines: (token) => authFetch("/rutinas", token),

  generateNewVersion: (token, budget) =>
    authFetch("/rutinas/generate", token, {
      method: "POST",
      body: JSON.stringify({ budget }),
    }),

  activateVersion: (token, versionId) =>
    authFetch(`/rutinas/versions/${versionId}/activate`, token, {
      method: "PUT",
    }),

  addStep: (token, versionId, stepPayload) =>
    authFetch(`/rutinas/versions/${versionId}/steps`, token, {
      method: "POST",
      body: JSON.stringify(stepPayload),
    }),

  replaceStep: (token, stepId, budget) =>
    authFetch(`/rutinas/steps/${stepId}/replace`, token, {
      method: "POST",
      body: JSON.stringify({ budget }),
    }),

  togglePauseStep: (token, stepId) =>
    authFetch(`/rutinas/steps/${stepId}/pause`, token, {
      method: "PATCH",
    }),

  toggleCompleteStep: (token, stepId) =>
    authFetch(`/rutinas/steps/${stepId}/complete`, token, {
      method: "POST",
    }),

  applySmartAdjustment: (token, versionId) =>
    authFetch(`/rutinas/versions/${versionId}/smart-adjust`, token, {
      method: "POST",
    }),
};