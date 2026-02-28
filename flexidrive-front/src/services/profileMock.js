// src/services/profileMock.js
import { DIRECCIONES_FRECUENTES_MOCK } from "./shipmentServices/shipmentsMock";

function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

let profile = {
  nombre: "Lucía",
  apellido: "Pigliacampi",
  email: "lucia@mail.com",
  telefono: "+54 9 353 000 000",
  ciudad: "Villa María",
  provincia: "Córdoba",
};

let direcciones = [...DIRECCIONES_FRECUENTES_MOCK];

export async function getProfile() {
  await wait(150);
  return profile;
}

export async function updateProfile(payload) {
  await wait(250);
  profile = { ...profile, ...payload };
  return profile;
}

export async function getDirecciones() {
  await wait(200);
  return direcciones;
}

export async function addDireccion(d) {
  await wait(250);
  const newD = { ...d, id: `d${Date.now()}` };
  direcciones = [newD, ...direcciones];
  return newD;
}

export async function deleteDireccion(id) {
  await wait(200);
  direcciones = direcciones.filter((x) => x.id !== id);
  return { ok: true };
}
