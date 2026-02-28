// src/services/shipmentServices/shipmentService.mock.js
import { SHIPMENTS_MOCK, COMISIONISTAS_MOCK } from "./shipmentsMock";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* =========================
   CLIENTE
========================= */

export async function getMyShipments({ estado = "todos", q = "" } = {}) {
  await wait(200);

  const query = q.trim().toLowerCase();

  const list = SHIPMENTS_MOCK.filter((s) => {
    const okEstado = estado === "todos" ? true : s.estado === estado;

    const okQuery =
      !query ||
      String(s.id).includes(query) ||
      s.cliente?.toLowerCase().includes(query) ||
      s.destino?.toLowerCase().includes(query) ||
      s.comisionista?.toLowerCase().includes(query);

    return okEstado && okQuery;
  });

  // ✅ Igual que axios
  return { data: list };
}

export async function getEnvioById(id) {
  await wait(150);
  const found = SHIPMENTS_MOCK.find((s) => String(s.id) === String(id));
  if (!found) throw new Error("Envío no encontrado");
  return { data: found };
}

export async function crearEnvio(data) {
  await wait(300);
  return {
    data: {
      ok: true,
      shipmentId: Math.floor(Math.random() * 9000 + 1000),
      data,
    },
  };
}

export async function editarEnvio(id, data) {
  await wait(250);
  return { data: { ok: true, id, data } };
}

export async function cancelarEnvio(id) {
  await wait(250);
  return { data: { ok: true, id } };
}

/* =========================
   COMISIONISTA
========================= */

export async function getEnviosDisponibles() {
  await wait(200);
  return { data: SHIPMENTS_MOCK.filter((s) => s.estado === "pendiente") };
}

export async function aceptarEnvio(data) {
  await wait(200);
  return { data: { ok: true, ...data } };
}

export async function actualizarEstadoEnvio(data) {
  await wait(200);
  return { data: { ok: true, ...data } };
}

export async function searchComisionistas() {
  await wait(250);
  return { data: COMISIONISTAS_MOCK };
}

/* =========================
   PAGO / CALIFICACIÓN (para que no rompa CalificarComisionista)
========================= */

export async function mockPay({ method }) {
  await wait(500);
  return {
    data: {
      ok: true,
      status: method === "mercadopago" ? "approved" : "registered",
    },
  };
}

export async function mockRate(payload) {
  await wait(350);
  return { data: { ok: true, payload } };
}

export async function confirmarComisionistaEnEnvio(envioId, data) {
  await wait(300);
  return {
    data: {
      ok: true,
      envioId,
      ...data,
      message: "Comisionista confirmado (mock).",
    },
  };
}