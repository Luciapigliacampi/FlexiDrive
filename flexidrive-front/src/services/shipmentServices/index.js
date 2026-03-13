// src/services/shipmentServices/index.js
import * as real from "./shipmentService";
import * as mock from "./shipmentService.mock";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK || "false") === "true";
const svc = USE_MOCK ? mock : real;

async function unwrap(promise) {
  const res = await promise;
  return res?.data !== undefined ? res.data : res;
}

export async function getMyShipments(params) {
  const data = await unwrap(svc.getMyShipments(params));
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.historial)) return data.historial;
  if (Array.isArray(data?.envios)) return data.envios;
  return [];
}

export async function getEnvioById(id) {
  return unwrap(svc.getEnvioById(id));
}

export async function crearEnvio(payload) {
  const data = await unwrap(svc.crearEnvio(payload));
  return data?.envio ?? data;
}

export async function editarEnvio(id, payload) {
  return unwrap(svc.editarEnvio(id, payload));
}

export async function cancelarEnvio(id) {
  return unwrap(svc.cancelarEnvio(id));
}

export async function archivarEnvio(id) {
  return unwrap(svc.archivarEnvio(id));
}

export async function eliminarEnvioLogico(id) {
  return unwrap(svc.eliminarEnvioLogico(id));
}

export async function getEnviosDisponibles() {
  return unwrap(svc.getEnviosDisponibles());
}

export async function aceptarEnvio(payload) {
  return unwrap(svc.aceptarEnvio(payload));
}

export async function actualizarEstadoEnvio(payload) {
  return unwrap(svc.actualizarEstadoEnvio(payload));
}

export async function searchComisionistas(params) {
  return unwrap(svc.searchComisionistas(params));
}

export async function mockPay(payload) {
  return unwrap((svc.mockPay ?? real.mockPay)(payload));
}

export async function calificarEnvio(payload) {
  return unwrap(real.calificarEnvio(payload));
}

export async function confirmarComisionistaEnEnvio(envioId, payload) {
  return unwrap(svc.confirmarComisionistaEnEnvio(envioId, payload));
}

export async function marcarEntregado(envioId) {
  return unwrap(svc.marcarEntregado(envioId));
}

export async function marcarRetirado(envioId) {
  return unwrap(svc.marcarRetirado(envioId));
}

export async function iniciarViaje(fecha) {
  return unwrap(svc.iniciarViaje(fecha));
}

export async function finalizarViaje(fecha) {
  return unwrap(svc.finalizarViaje(fecha));
}

export async function cancelarPorComisionista(id) {
  return unwrap(svc.cancelarPorComisionista(id));
}

export async function actualizarCalificacion(payload) {
  return unwrap(real.actualizarCalificacion(payload));
}

export async function confirmarPago(id, metodo) {
  return unwrap(svc.confirmarPago(id, metodo));
}

export const __USE_MOCK__ = USE_MOCK;

export async function archivarEnvioComisionista(id) {
  return unwrap(svc.archivarEnvioComisionista(id));
}
