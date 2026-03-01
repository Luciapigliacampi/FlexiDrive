//flexidrive-front\src\services\comisionistaServices\real.js
import api from "../api";
import { tripPlanToRutaUI } from "../tripPlanMappers";

const ENVIO_BASE  = import.meta.env.VITE_ENVIO_API_URL  || "http://localhost:3001";
const VIAJES_BASE = import.meta.env.VITE_VIAJES_API_URL || "http://localhost:3004";
const IA_BASE     = import.meta.env.VITE_IA_API_URL     || "http://localhost:3002";

// ─── Dashboard ────────────────────────────────────────────────────────────────

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
  return res.data?.items || res.data;
}

// ─── Ruta sugerida via ia-route-service ──────────────────────────────────────

export async function generarRutaHoyApi({ comisionistaId, fecha }) {
  const hoy = fecha || new Date().toISOString().split("T")[0];
  const res = await api.get(
    `${IA_BASE}/api/rutas/generar/${comisionistaId}`,
    { params: { fecha: hoy } }
  );
  return res.data;
}

export async function getRutaActivaApi({ comisionistaId }) {
  const res = await api.get(`${IA_BASE}/api/rutas/activa/${comisionistaId}`);
  return res.data;
}

// ─── Rutas (TripPlans) ────────────────────────────────────────────────────────

export const listRutasApi = async ({ q } = {}) => {
  const res = await api.get(`${VIAJES_BASE}/api/trip/mine`, { params: { q } });
  const tripPlans = res.data?.tripPlans ?? [];
  return tripPlans.map(tripPlanToRutaUI);
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
};