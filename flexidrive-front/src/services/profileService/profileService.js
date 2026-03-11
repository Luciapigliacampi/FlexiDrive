import api from "../api";

import {
  getDirecciones as _getDirecciones,
  addDireccion as _addDireccion,
  deleteDireccion as _deleteDireccion,
} from "../direccionesService";

import {
  getDestinatarios as _getDestinatarios,
  addDestinatario as _addDestinatario,
  deleteDestinatario as _deleteDestinatario,
} from "../destinatariosService";

const AUTH_BASE = import.meta.env.VITE_AUTH_API_URL || "http://localhost:3000";

// helper para soportar respuestas: array / {data:[]}/ {direcciones:[]}/{destinatarios:[]}
function normalizeList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/* PERFIL */
export async function getMyProfile() {
  const res = await api.get(`${AUTH_BASE}/api/auth/me`);
  const raw = res?.data || {};

  // Soporta varias formas de respuesta del backend
  // 1) { usuario: {...}, rol, comisionista }
  // 2) { ...usuario, rol }
  // 3) { data: { usuario: {...}, rol } }
  const source = raw?.usuario
    ? raw
    : raw?.data?.usuario
    ? raw.data
    : { usuario: raw, rol: raw?.rol, comisionista: raw?.comisionista };

  return {
    ...(source?.usuario || {}),
    rol: source?.rol || source?.usuario?.rol || "cliente",
    comisionista: source?.comisionista ?? null,
  };
}

/* Direcciones */
export async function getDirecciones() {
  const data = await _getDirecciones();
  return normalizeList(data, "direcciones");
}

export async function addDireccion(payload) {
  const data = await _addDireccion(payload);
  return data?.direccion ?? data?.data ?? data;
}

export async function deleteDireccion(id) {
  return _deleteDireccion(id);
}

/* Destinatarios */
export async function getDestinatarios() {
  const data = await _getDestinatarios();
  return normalizeList(data, "destinatarios");
}

export async function addDestinatario(payload) {
  const data = await _addDestinatario(payload);
  return data?.destinatario ?? data?.data ?? data;
}

export async function deleteDestinatario(id) {
  return _deleteDestinatario(id);
}