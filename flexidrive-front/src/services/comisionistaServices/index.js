//flexidrive-front\src\services\comisionistaServices\index.js
import {
  getDashboardResumenMock, getAgendaHoyMock, getRutaSugeridaMock, listRutasMock, createRutaMock, updateRutaMock, deleteRutaMock
} from "./mock";
import {
  getDashboardResumenApi, getAgendaHoyApi, getRutaSugeridaApi, listRutasApi, createRutaApi, updateRutaApi, deleteRutaApi
} from "./real";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK || "true") === "true";

export const getDashboardResumen = (params) =>
  USE_MOCK ? getDashboardResumenMock(params) : getDashboardResumenApi(params);

export const getAgendaHoy = (params) =>
  USE_MOCK ? getAgendaHoyMock(params) : getAgendaHoyApi(params);

export const getRutaSugerida = (params) =>
  USE_MOCK ? getRutaSugeridaMock(params) : getRutaSugeridaApi(params);

export const listRutas = (params) => (USE_MOCK ? listRutasMock(params) : listRutasApi(params));
export const createRuta = (data) => (USE_MOCK ? createRutaMock(data) : createRutaApi(data));
export const updateRuta = (id, data) => (USE_MOCK ? updateRutaMock(id, data) : updateRutaApi(id, data));
export const deleteRuta = (id) => (USE_MOCK ? deleteRutaMock(id) : deleteRutaApi(id));