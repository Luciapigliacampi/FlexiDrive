// src/services/profileService/profileService.js
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

// helper para soportar respuestas: array / {data:[]}/ {direcciones:[]}/{destinatarios:[]}
function normalizeList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
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