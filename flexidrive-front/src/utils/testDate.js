// flexidrive-front/src/utils/testDate.js

export const USE_TEST_DATE = import.meta.env.VITE_USE_TEST_DATE === "true";

// ─── Estado en memoria (mutable en runtime) ───────────────────────────────────
// Se inicializa con los valores del .env, pero el panel puede sobreescribirlos
// llamando a setTestConfig({ fecha, hora }) sin recompilar ni recargar.
let _runtimeDate = import.meta.env.VITE_TEST_DATE || null;
let _runtimeHour = import.meta.env.VITE_TEST_HOUR !== undefined
  ? parseInt(import.meta.env.VITE_TEST_HOUR, 10)
  : null;

/**
 * Llamado por TestDatePanel cuando el usuario aplica una nueva fecha/hora.
 * Actualiza el estado en memoria para que getTodayString/getNowHour
 * devuelvan los nuevos valores inmediatamente, sin reload.
 */
export function setTestConfig({ fecha, hora }) {
  if (fecha !== undefined) _runtimeDate = fecha;
  if (hora  !== undefined) _runtimeHour = typeof hora === "string" ? parseInt(hora, 10) : hora;
}

export function getTodayString(dateStr) {
  if (dateStr) return dateStr;                   // override explícito siempre gana
  if (USE_TEST_DATE && _runtimeDate) return _runtimeDate;
  return new Date().toISOString().split("T")[0]; // producción: fecha real
}

export function getNowHour() {
  if (USE_TEST_DATE && _runtimeHour !== null && !isNaN(_runtimeHour)) return _runtimeHour;
  return new Date().getHours();                  // producción: hora real
}