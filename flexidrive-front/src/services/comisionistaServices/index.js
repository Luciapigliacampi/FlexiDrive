// flexidrive-front/src/services/comisionistaServices/index.js
import {
  getDashboardResumenMock,
  getAgendaHoyMock,
  generarRutaHoyMock,
  getRutaActivaMock,
  listRutasMock,
  createRutaMock,
  updateRutaMock,
  deleteRutaMock,
  confirmarFechaRetiroMock,
  completarParadaMock,
  getEstadisticasComisionistaMock,
} from "./mock";

import {
  getDashboardResumenApi,
  getAgendaHoyApi,
  generarRutaHoyApi,
  getRutaActivaApi,
  listRutasApi,
  createRutaApi,
  updateRutaApi,
  deleteRutaApi,
  toggleRutaActivaApi,
  confirmarFechaRetiroApi,
  completarParadaApi,
  getEstadisticasComisionistaApi,
} from "./real";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "true") === "true";

export const getDashboardResumen = (params) =>
  USE_MOCK ? getDashboardResumenMock(params) : getDashboardResumenApi(params);

export const getAgendaHoy = (params) =>
  USE_MOCK ? getAgendaHoyMock(params) : getAgendaHoyApi(params);

export const generarRutaHoy = (params) =>
  USE_MOCK ? generarRutaHoyMock(params) : generarRutaHoyApi(params);

export const getRutaActiva = (params) =>
  USE_MOCK ? getRutaActivaMock(params) : getRutaActivaApi(params);

export const confirmarFechaRetiro = (params) =>
  USE_MOCK ? confirmarFechaRetiroMock(params) : confirmarFechaRetiroApi(params);

export const completarParada = (params) =>
  USE_MOCK ? completarParadaMock(params) : completarParadaApi(params);

export const listRutas = (params) =>
  USE_MOCK ? listRutasMock(params) : listRutasApi(params);

export const createRuta = (data) =>
  USE_MOCK ? createRutaMock(data) : createRutaApi(data);

export const updateRuta = (id, data) =>
  USE_MOCK ? updateRutaMock(id, data) : updateRutaApi(id, data);

export const deleteRuta = (id) =>
  USE_MOCK ? deleteRutaMock(id) : deleteRutaApi(id);

export const toggleRutaActiva = (id, activa) =>
  USE_MOCK ? updateRutaMock(id, { activo: activa }) : toggleRutaActivaApi(id, activa);

// FIX: se agrega el segundo argumento `params` ({ desde, hasta }) para que
// el rango de fechas seleccionado en el dashboard llegue al servicio real.
export const getEstadisticasComisionista = (comisionistaId, params) =>
  USE_MOCK
    ? getEstadisticasComisionistaMock(comisionistaId, params)
    : getEstadisticasComisionistaApi(comisionistaId, params);
