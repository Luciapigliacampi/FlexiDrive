// src/services/mapsService.js
import api from "./api";

const IA_BASE = import.meta.env.VITE_IA_API_URL || "http://localhost:3002";

export async function getAddressSuggestions(input) {
  if (!input || input.trim().length < 3) return [];
  const res = await api.get(`${IA_BASE}/api/rutas/autocomplete`, { params: { input } });
  return Array.isArray(res.data) ? res.data : [];
}

export async function getPlaceDetails(placeId) {
  if (!placeId) return null;
  const res = await api.get(`${IA_BASE}/api/rutas/details`, { params: { placeId } });
  return res.data;
}

// ✅ NUEVO: seguimiento enriquecido para TrackingEnvio
export async function getSeguimientoEnvio(envioId) {
  const res = await api.get(`${IA_BASE}/api/rutas/seguimiento/${envioId}`);
  return res.data;
}