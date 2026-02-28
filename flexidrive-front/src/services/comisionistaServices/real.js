//flexidrive-front\src\services\comisionistaServices\real.js
import api from "../api";
import { tripPlanToRutaUI } from "../tripPlanMappers"

// Elegí UN base según tu arquitectura.
// Si tu dashboard sale del envio-service:
const ENVIO_BASE = import.meta.env.VITE_ENVIO_API_URL || "http://localhost:3001";
const VIAJES_BASE = import.meta.env.VITE_VIAJES_API_URL || "http://localhost:3004";


export async function getDashboardResumenApi({ date } = {}) {
  const res = await api.get(`${ENVIO_BASE}/api/comisionista/dashboard/resumen`, {
    params: { date },
  });
  return res.data;
}

export async function getAgendaHoyApi({ date } = {}) {
  const res = await api.get(`${ENVIO_BASE}/api/comisionista/dashboard/agenda`, {
    params: { date },
  });
  return res.data?.items || res.data; // flexible
}

export async function getRutaSugeridaApi({ date } = {}) {
  const res = await api.get(`${ENVIO_BASE}/api/comisionista/dashboard/ruta-sugerida`, {
    params: { date },
  });
  return res.data;
}

// Si esto lo vas a guardar en viajes-service, cambiás esta base.
// Por ahora lo dejo configurable.

export const listRutasApi = async ({ q } = {}) => {
  const res = await api.get(`${VIAJES_BASE}/api/trip/mine`, { params: { q } });
  const tripPlans = res.data?.tripPlans ?? [];
  return tripPlans.map(tripPlanToRutaUI);  // ← convertir antes de devolver
};

export const createRutaApi = async (data) => {
  const res = await api.post(`${VIAJES_BASE}/api/trip`, data);
  return res.data?.tripPlan;
};
export const updateRutaApi = async (id, data) => {
  const res = await api.put(`${VIAJES_BASE}/api/trip/${id}`, data);
  return res.data?.tripPlan;
};
export const deleteRutaApi = async (id) => {
  const res = await api.delete(`${VIAJES_BASE}/api/trip/${id}`);
  return res.data;
};

export const toggleRutaActivaApi = async (id, activa) => {
  const res = await api.patch(`${VIAJES_BASE}/api/trip/${id}/activo`, { activo: activa });
  return res.data?.tripPlan;
}