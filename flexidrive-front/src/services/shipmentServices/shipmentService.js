// src/services/shipmentServices/shipmentService.js
import api from "../api";

const AUTH_BASE = import.meta.env.VITE_AUTH_API_URL || "http://localhost:3000";
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

/* =========================
   COMISIONISTA (envio-service)
========================= */

export const getEnviosDisponibles = () => api.get(`${ENVIO_BASE}/api/envios/disponibles`);

export const aceptarEnvio = (data) => api.patch(`${ENVIO_BASE}/api/envios/aceptar`, data);

export const actualizarEstadoEnvio = (data) =>
  api.patch(`${ENVIO_BASE}/api/envios/actualizar-estado`, data);

/* =========================
   Buscar comisionistas (auth-service)
   GET /api/auth/comisionistas/habilitados (público)
========================= */

export async function searchComisionistas({ fechaEntrega, origenCiudad, destinoCiudad, bultos }) {
  const res = await api.get(`${VIAJES_BASE}/api/search/comisionistas`, {
    params: { fechaEntrega, origenCiudad, destinoCiudad, bultos },
  });


  // // El back devuelve: [{ id, nombre, apellido, email, verificado }]
  // const list = Array.isArray(res.data) ? res.data : [];

  // // Adaptación para tu UI actual (precio/rating/eta todavía no vienen del back)
  // const mapped = list.map((c, idx) => ({
  //   id: c.id,
  //   nombre: `${c.nombre} ${c.apellido || ""}`.trim(),
  //   rating: 4.7, // placeholder hasta integrar reputación real
  //   precioEstimado: 1200 + idx * 250, // placeholder hasta lógica de precios por ruta
  //   // eta: "—",
  //   verificado: !!c.verificado,
  // }));

  // return { data: mapped };


  // devuelve { total, comisionistas }
  return res.data
}

/* =========================
   CALIFICACIONES (calificaciones-service)
   POST /api/calificaciones  (requiere token + rol cliente)
========================= */

export const mockRate = (payload) =>
  api.post(`${CAL_BASE}/api/calificaciones`, payload);

/* =========================
   PAGO (todavía mock si no hay servicio pago)
========================= */
export const mockPay = ({ method }) =>
  Promise.resolve({
    data: { ok: true, status: method === "mercadopago" ? "approved" : "registered" },
  });




export const confirmarComisionistaEnEnvio = (envioId, data) =>
  api.patch(`${ENVIO_BASE}/api/envios/${envioId}/confirmar-comisionista`, data);