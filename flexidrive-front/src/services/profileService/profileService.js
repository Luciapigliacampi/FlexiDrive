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

export async function updateMyProfile(payload) {
  const res = await api.put(`${AUTH_BASE}/api/auth/update`, payload);
  return res?.data || {};
}

/* Direcciones */
export async function getDirecciones() {
  const data = await _getDirecciones();
  return normalizeList(data, "direcciones");
}

export async function addDireccion(payload) {
  const res = await _addDireccion(payload);
  const data = res?.data ?? res;
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
  const res = await _addDestinatario(payload);
  const data = res?.data ?? res;
  return data?.destinatario ?? data?.data ?? data;
}

export async function deleteDestinatario(id) {
  return _deleteDestinatario(id);
}