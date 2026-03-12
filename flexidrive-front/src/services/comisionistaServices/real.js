// flexidrive-front/src/services/comisionistaServices/real.js
import api from "../api";
import axios from "axios";

const BASE = "/api/comisionista";
const ENVIO_BASE =
  import.meta.env.VITE_ENVIO_API_URL || "http://localhost:3001";

export const getDashboardResumenApi = async (params = {}) => {
  const { data } = await api.get(`${BASE}/dashboard/resumen`, { params });
  return data;
};

export const getAgendaHoyApi = async (params = {}) => {
  const { data } = await api.get(`${BASE}/dashboard/agenda`, { params });
  return data;
};

export const generarRutaHoyApi = async (params = {}) => {
  const { data } = await api.post(`${BASE}/ruta/generar`, params);
  return data;
};

export const getRutaActivaApi = async (params = {}) => {
  const { data } = await api.get(`${BASE}/ruta/activa`, { params });
  return data;
};

export const listRutasApi = async (params = {}) => {
  const { data } = await api.get(`${BASE}/rutas`, { params });
  return data;
};

export const createRutaApi = async (payload) => {
  const { data } = await api.post(`${BASE}/rutas`, payload);
  return data;
};

export const updateRutaApi = async (id, payload) => {
  const { data } = await api.put(`${BASE}/rutas/${id}`, payload);
  return data;
};

export const deleteRutaApi = async (id) => {
  const { data } = await api.delete(`${BASE}/rutas/${id}`);
  return data;
};

export const toggleRutaActivaApi = async (id, activa) => {
  const { data } = await api.patch(`${BASE}/rutas/${id}/activa`, { activa });
  return data;
};

export const confirmarFechaRetiroApi = async (params = {}) => {
  const { data } = await api.post(`${BASE}/confirmar-fecha-retiro`, params);
  return data;
};

export const completarParadaApi = async (params = {}) => {
  const { data } = await api.post(`${BASE}/completar-parada`, params);
  return data;
};

export const getEstadisticasComisionistaApi = async (comisionistaId) => {
  const { data } = await axios.get(
    `${ENVIO_BASE}/api/estadisticas/comisionista/${comisionistaId}`
  );
  return data;
};