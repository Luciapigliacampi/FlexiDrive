//flexidrive-front\src\services\profileService\index.js
import * as real from "./profileService";
import * as mock from "./profileService.mock";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK || "false") === "true";
const svc = USE_MOCK ? mock : real;

async function unwrap(promise) {
  const res = await promise;
  return res?.data !== undefined ? res.data : res;
}

/* ORIGEN */
export async function getDirecciones() {
  return unwrap(svc.getDirecciones());
}
export async function addDireccion(payload) {
  return unwrap(svc.addDireccion(payload));
}
export async function deleteDireccion(id) {
  return unwrap(svc.deleteDireccion(id));
}

/* DESTINO */
export async function getDestinatarios() {
  return unwrap(svc.getDestinatarios());
}
export async function addDestinatario(payload) {
  return unwrap(svc.addDestinatario(payload));
}
export async function deleteDestinatario(id) {
  return unwrap(svc.deleteDestinatario(id));
}

export const __USE_MOCK__ = USE_MOCK;