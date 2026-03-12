// flexidrive-front/src/utils/testDate.js

export const USE_TEST_DATE = import.meta.env.VITE_USE_TEST_DATE === "true";

// ─── Fuente de verdad: backend (via TestDatePanel.fetchConfig)
// ─── Fallback 1: sessionStorage (cache de la última config aplicada)
// ─── Fallback 2: VITE_TEST_DATE / VITE_TEST_HOUR del .env
// ─── Fallback 3: fecha/hora real del sistema

function initDate() {
  if (!USE_TEST_DATE) return null;
  const ss = sessionStorage.getItem("TEST_DATE");
  if (ss) return ss;
  return import.meta.env.VITE_TEST_DATE || null;
}

function initHour() {
  if (!USE_TEST_DATE) return null;
  const ss = sessionStorage.getItem("TEST_HOUR");
  if (ss !== null) return parseInt(ss, 10);
  const env = import.meta.env.VITE_TEST_HOUR;
  return env !== undefined ? parseInt(env, 10) : null;
}

let _runtimeDate = initDate();
let _runtimeHour = initHour();

/**
 * Llamado por TestDatePanel cuando aplica nueva fecha/hora desde el backend.
 * Actualiza memoria + sessionStorage para sobrevivir recargas.
 */
export function setTestConfig({ fecha, hora }) {
  if (fecha !== undefined) {
    _runtimeDate = fecha;
    sessionStorage.setItem("TEST_DATE", fecha);
  }
  if (hora !== undefined) {
    _runtimeHour = typeof hora === "string" ? parseInt(hora, 10) : hora;
    sessionStorage.setItem("TEST_HOUR", String(_runtimeHour));
  }
}

/**
 * Limpia la cache de sessionStorage (útil al hacer logout o reset manual).
 */
export function clearTestConfig() {
  sessionStorage.removeItem("TEST_DATE");
  sessionStorage.removeItem("TEST_HOUR");
  _runtimeDate = import.meta.env.VITE_TEST_DATE || null;
  _runtimeHour = import.meta.env.VITE_TEST_HOUR !== undefined
    ? parseInt(import.meta.env.VITE_TEST_HOUR, 10)
    : null;
}

export function getTodayString(dateStr) {
  if (dateStr) return dateStr;
  if (USE_TEST_DATE && _runtimeDate) return _runtimeDate;
  return new Date().toISOString().split("T")[0];
}

export function getNowHour() {
  if (USE_TEST_DATE && _runtimeHour !== null && !isNaN(_runtimeHour)) return _runtimeHour;
  return new Date().getHours();
}
