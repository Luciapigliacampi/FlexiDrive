// flexidrive-front/src/services/comisionistaServices/real.js
import api from "../api";
import axios from "axios";
import { getTodayString } from "../../utils/testDate";

const BASE = "/api/comisionista";
const ENVIO_BASE =
  import.meta.env.VITE_ENVIO_API_URL || "http://localhost:3001";
const IA_ROUTE_BASE =
  import.meta.env.VITE_IA_API_URL || "http://localhost:3002";
const VIAJES_BASE =
  import.meta.env.VITE_VIAJES_API_URL || "http://localhost:3004";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardResumenApi({ date } = {}) {
  const fecha = getTodayString(date);
  const res = await api.get(
    `${ENVIO_BASE}/api/envios/comisionista/dashboard/resumen`,
    { params: { date: fecha } }
  );
  return res.data;
}

export async function getAgendaHoyApi({ date } = {}) {
  const fecha = getTodayString(date);
  const res = await api.get(
    `${ENVIO_BASE}/api/envios/comisionista/dashboard/agenda`,
    { params: { date: fecha } }
  );
  return res.data?.items || res.data;
}

// ─── Ruta optimizada via ia-route-service ────────────────────────────────────

export async function generarRutaHoyApi({
  comisionistaId,
  fecha,
  latActual,
  lngActual,
} = {}) {
  const hoy = getTodayString(fecha);
  const params = { fecha: hoy };
  if (latActual != null) params.latActual = latActual;
  if (lngActual != null) params.lngActual = lngActual;
  const res = await api.get(
    `${IA_ROUTE_BASE}/api/rutas/generar/${comisionistaId}`,
    { params }
  );
  return res.data;
}

export async function getRutaActivaApi({ comisionistaId }) {
  const res = await api.get(
    `${IA_ROUTE_BASE}/api/rutas/activa/${comisionistaId}`
  );
  return res.data;
}

export async function confirmarFechaRetiroApi({
  envioId,
  fecha,
  comisionistaId,
}) {
  const res = await api.patch(
    `${IA_ROUTE_BASE}/api/rutas/parada/${envioId}/confirmar-retiro`,
    { fecha, comisionistaId }
  );
  return res.data;
}

export async function completarParadaApi({
  envioId,
  tipo,
  comisionistaId,
  fecha,
  latActual,
  lngActual,
}) {
  const res = await api.patch(
    `${IA_ROUTE_BASE}/api/rutas/parada/${envioId}/completar`,
    { tipo, comisionistaId, fecha, latActual, lngActual }
  );
  return res.data;
}

// ─── Rutas (TripPlans) ───────────────────────────────────────────────────────

export const listRutasApi = async ({ q } = {}) => {
  const res = await api.get(`${VIAJES_BASE}/api/trip/mine`, {
    params: { q },
  });
  const tripPlans = res.data?.tripPlans ?? [];
  return tripPlans.map(tripPlanToRutaUI);
};

export const createRutaApi = async (payload) => {
  const res = await api.post(`${VIAJES_BASE}/api/trip`, payload);
  return tripPlanToRutaUI(res.data?.tripPlan ?? res.data);
};

export const updateRutaApi = async (id, payload) => {
  const res = await api.put(`${VIAJES_BASE}/api/trip/${id}`, payload);
  return tripPlanToRutaUI(res.data?.tripPlan ?? res.data);
};

export const deleteRutaApi = async (id) => {
  const res = await api.delete(`${VIAJES_BASE}/api/trip/${id}`);
  return res.data;
};

export const toggleRutaActivaApi = async (id, activa) => {
  const res = await api.patch(`${VIAJES_BASE}/api/trip/${id}/activo`, {
    activo: activa,   // backend espera "activo", no "activa"
  });
  return res.data;
};

// ─── Estadísticas ────────────────────────────────────────────────────────────

export const getEstadisticasComisionistaApi = async (comisionistaId) => {
  const { data } = await axios.get(
    `${ENVIO_BASE}/api/estadisticas/comisionista/${comisionistaId}`
  );
  return data;
};

// ─── Mapper: TripPlan (backend) → RutaUI (frontend) ─────────────────────────

function tripPlanToRutaUI(tp = {}) {
  return {
    // Identidad
    id:    tp._id || tp.id,
    _id:   tp._id || tp.id,

    // Nombre legacy (algunos mocks lo usan)
    nombre: tp.nombre || tp.title || "",

    // Lugares
    origen:      tp.origen      || null,
    destino:     tp.destino     || null,
    intermedias: Array.isArray(tp.intermedias) ? tp.intermedias : [],

    // Días operativos (el backend guarda diasSemana como números)
    dias:        Array.isArray(tp.dias)       ? tp.dias
               : Array.isArray(tp.diasSemana) ? diasSemanaToLabels(tp.diasSemana)
               : [],

    // Estado
activa: tp.activo ?? tp.activa ?? tp.isActive ?? false,

    // Precios — normalizar precio → precioPorBulto para RutaCard
    preciosPorLocalidad: Array.isArray(tp.preciosPorLocalidad)
      ? tp.preciosPorLocalidad.map((p) => ({
          ...p,
          precioPorBulto: p.precioPorBulto ?? p.precio ?? 0,
        }))
      : [],

    // Descuento
    descuentoPorBultos: tp.descuentoPorBultos ?? {
      minBultos: 0,
      tipo: "porcentaje",
      valor: 0,
    },

    // Campos legacy que algunos mocks / RutaModal pueden usar
    horarioSalida: tp.horarioSalida || tp.departureTime || "",
    vehiculoId:    tp.vehiculoId    || "",
    precioBase:    tp.precioBase    || tp.basePrice     || null,

    // Raw por si algún componente necesita campos extra
    raw: tp,
  };
}

// Convierte [1,2,3,4,5] → ["Lun","Mar","Mié","Jue","Vie"]
const DIA_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
function diasSemanaToLabels(nums) {
  return nums.map((n) => DIA_LABELS[n] ?? String(n));
}
