// flexidrive-front\src\utils\estadoUtils.js
import { ESTADOS_ENVIO } from "../config/estadosEnvio";

export const toEstadoKey = (estado) =>
  String(estado || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export const capitalize = (str) => {
  const s = String(str || "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export const estadoLabel = (estadoRaw) => {
  const key = toEstadoKey(estadoRaw);
  return ESTADOS_ENVIO[key]?.label || capitalize(key.replaceAll("_", " "));
};

export const estadoCls = (estadoRawOrKey) => {
  const key = toEstadoKey(estadoRawOrKey);
  return ESTADOS_ENVIO[key]?.cls;
};

export const estadoIcon = (estadoRawOrKey) => {
  const key = toEstadoKey(estadoRawOrKey);
  return ESTADOS_ENVIO[key]?.Icon;
};

export const estadoOrder = (estadoRawOrKey) => {
  const key = toEstadoKey(estadoRawOrKey);
  return ESTADOS_ENVIO[key]?.order ?? 0;
};

export const isEstadoFinal = (estadoRawOrKey) => {
  const key = toEstadoKey(estadoRawOrKey);
  return !!ESTADOS_ENVIO[key]?.isFinal;
};