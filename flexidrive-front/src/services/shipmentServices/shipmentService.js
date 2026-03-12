// src/services/shipmentServices/shipmentService.js
import api from "../api";

const ENVIO_BASE = import.meta.env.VITE_ENVIO_API_URL || "http://localhost:3001";
const CAL_BASE = import.meta.env.VITE_CALIFICACIONES_API_URL || "http://localhost:3003";
const VIAJES_BASE = import.meta.env.VITE_VIAJES_API_URL || "http://localhost:3004";

/* =========================
   CLIENTE (envio-service)
========================= */

export const crearEnvio = (data) => api.post(`${ENVIO_BASE}/api/envios`, data);

// back: GET /api/envios/historial => { totalEnvios, historial }
export const getMyShipments = (params) =>
  api.get(`${ENVIO_BASE}/api/envios/historial`, { params });

export const getEnvioById = (id) => api.get(`${ENVIO_BASE}/api/envios/${id}`);

export const editarEnvio = (id, data) => api.put(`${ENVIO_BASE}/api/envios/${id}`, data);

export const cancelarEnvio = (id) => api.delete(`${ENVIO_BASE}/api/envios/${id}`);

export const archivarEnvio = (id) =>
  api.patch(`${ENVIO_BASE}/api/envios/${id}/archivar`);

export const eliminarEnvioLogico = (id) =>
  api.patch(`${ENVIO_BASE}/api/envios/${id}/eliminar`);

/* =========================
   COMISIONISTA (envio-service)
========================= */

export const getEnviosDisponibles = () => api.get(`${ENVIO_BASE}/api/envios/disponibles`);

export const aceptarEnvio = (data) => api.patch(`${ENVIO_BASE}/api/envios/aceptar`, data);

export const actualizarEstadoEnvio = (data) =>
  api.patch(`${ENVIO_BASE}/api/envios/actualizar-estado`, data);

export const cancelarPorComisionista = (id) =>
  api.patch(`${ENVIO_BASE}/api/envios/${id}/cancelar-comisionista`);

/* =========================
   Buscar comisionistas (auth-service)
   GET /api/auth/comisionistas/habilitados (público)
========================= */

export async function searchComisionistas(params) {
  const clean = Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

  const res = await api.get(`${VIAJES_BASE}/api/search/comisionistas`, {
    params: clean,
  });

  return res.data;
}

/* =========================
   CALIFICACIONES (calificaciones-service)
   POST /api/calificaciones  (requiere token + rol cliente)
========================= */

export async function calificarEnvio({ id, rating, comment }) {
  const CAL_BASE = import.meta.env.VITE_CALIFICACIONES_API_URL || "http://localhost:3003";
  const res = await api.post(`${CAL_BASE}/api/calificaciones`, {
    envioId: id,
    puntuacion: rating,
    comentario: comment,
  });
  return res?.data ?? res;
}

/* =========================
   PAGO (todavía mock si no hay servicio pago)
========================= */
export const mockPay = ({ method }) =>
  Promise.resolve({
    data: { ok: true, status: method === "mercadopago" ? "approved" : "registered" },
  });

export const confirmarComisionistaEnEnvio = (envioId, data) =>
  api.patch(`${ENVIO_BASE}/api/envios/${envioId}/confirmar-comisionista`, data);

export const marcarRetirado = (envioId) =>
  api.patch(`${ENVIO_BASE}/api/envios/${envioId}/marcar-retirado`);

export const marcarEntregado = (envioId) =>
  api.patch(`${ENVIO_BASE}/api/envios/${envioId}/marcar-entregado`);

export const iniciarViaje = (fecha) =>
  api.post(`${ENVIO_BASE}/api/envios/comisionista/dashboard/iniciar-viaje`, { fecha });

export const finalizarViaje = (fecha) =>
  api.post(`${ENVIO_BASE}/api/envios/comisionista/dashboard/finalizar-viaje`, { fecha });

export async function actualizarCalificacion({ id, rating, comment }) {
  const CAL_BASE = import.meta.env.VITE_CALIFICACIONES_API_URL || "http://localhost:3003";
  const res = await api.put(`${CAL_BASE}/api/calificaciones/envio/${id}`, {
    puntuacion: rating,
    comentario: comment,
  });
  return res?.data ?? res;
}