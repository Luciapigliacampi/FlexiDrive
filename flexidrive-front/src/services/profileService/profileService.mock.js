//flexidrive-front\src\services\profileService\profileService.mock.js
import { DIRECCIONES_FRECUENTES_MOCK } from "../shipmentServices/shipmentsMock";

let direcciones = [...DIRECCIONES_FRECUENTES_MOCK];

let destinatarios = [
  {
    id: "c1",
    alias: "Mamá",
    apellido: "Pérez",
    nombre: "Laura",
    dni: "30111222",
    telefono: "3534000000",
    direccion: "San Martín 100",
    ciudad: "Villa María",
    provincia: "Córdoba",
    cp: "5900",
  },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getDirecciones() {
  await wait(200);
  return { data: direcciones };
}

export async function addDireccion(payload) {
  await wait(250);
  const created = { id: `d_${Date.now()}`, ...payload };
  direcciones = [created, ...direcciones];
  return { data: created };
}

export async function deleteDireccion(id) {
  await wait(200);
  direcciones = direcciones.filter((d) => d.id !== id);
  return { data: { ok: true } };
}

export async function getDestinatarios() {
  await wait(200);
  return { data: destinatarios };
}

export async function addDestinatario(payload) {
  await wait(250);
  const created = { id: `c_${Date.now()}`, ...payload };
  destinatarios = [created, ...destinatarios];
  return { data: created };
}

export async function deleteDestinatario(id) {
  await wait(200);
  destinatarios = destinatarios.filter((d) => d.id !== id);
  return { data: { ok: true } };
}