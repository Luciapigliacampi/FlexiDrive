import * as real from "./profileService";
import * as mock from "./profileService.mock";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK || "false") === "true";

function getSvc() {
  return USE_MOCK ? mock : real;
}

async function unwrap(promise) {
  const res = await promise;
  return res?.data !== undefined ? res.data : res;
}

/* PERFIL */
export async function getMyProfile() {
  const svc = getSvc();
  return unwrap(svc.getMyProfile());
}

export async function updateMyProfile(payload) {
  const svc = getSvc();
  return unwrap(svc.updateMyProfile(payload));
}

/* ORIGEN */
export async function getDirecciones() {
  const svc = getSvc();
  return unwrap(svc.getDirecciones());
}

export async function addDireccion(payload) {
  const svc = getSvc();
  return unwrap(svc.addDireccion(payload));
}

export async function deleteDireccion(id) {
  const svc = getSvc();
  return unwrap(svc.deleteDireccion(id));
}

/* DESTINO */
export async function getDestinatarios() {
  const svc = getSvc();
  return unwrap(svc.getDestinatarios());
}

export async function addDestinatario(payload) {
  const svc = getSvc();
  return unwrap(svc.addDestinatario(payload));
}

export async function deleteDestinatario(id) {
  const svc = getSvc();
  return unwrap(svc.deleteDestinatario(id));
}

export const __USE_MOCK__ = USE_MOCK;