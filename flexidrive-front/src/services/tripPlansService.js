import api from "./api";

const VIAJES_BASE = import.meta.env.VITE_VIAJES_API_URL || "http://localhost:3004";

/**
 * TripPlan (viajes-service)
 * Base path: /api/trip
 * Endpoints:
 * - GET    /mine
 * - POST   /
 * - PUT    /:id
 * - PATCH  /:id/activo
 * - DELETE /:id
 */

export async function getMyTripPlans() {
  const res = await api.get(`${VIAJES_BASE}/api/trip/mine`);
  // res.data = { total, tripPlans }
  return res.data;
}

export async function createTripPlan(payload) {
  const res = await api.post(`${VIAJES_BASE}/api/trip`, payload);
  // res.data = { message, tripPlan }
  return res.data;
}

export async function updateTripPlan(id, payload) {
  const res = await api.put(`${VIAJES_BASE}/api/trip/${id}`, payload);
  // res.data = { message, tripPlan }
  return res.data;
}

export async function setTripPlanActivo(id, activo) {
  const res = await api.patch(`${VIAJES_BASE}/api/trip/${id}/activo`, { activo });
  // res.data = { message, tripPlan }
  return res.data;
}

export async function deleteTripPlan(id) {
  const res = await api.delete(`${VIAJES_BASE}/api/trip/${id}`);
  // res.data = { ok: true }
  return res.data;
}