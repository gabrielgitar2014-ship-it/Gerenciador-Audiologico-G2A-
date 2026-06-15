// URL base do "Cérebro G2A" (backend FastAPI com os agentes de IA).
// Em teste local, o backend roda em http://localhost:8000.
export const G2A_BRAIN_URL =
  import.meta.env.VITE_G2A_API_URL || 'http://localhost:8000';
