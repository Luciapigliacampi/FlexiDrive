// microservicios/envio-service/src/utils/testDate.js

export const TEST_DATE_DEFAULT = '2026-03-06';
export const USE_TEST_DATE = process.env.USE_TEST_DATE === 'true';

function getTestHour() {
  const raw = process.env.TEST_HOUR;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

function getTestDate() {
  return process.env.TEST_DATE || TEST_DATE_DEFAULT;
}

export function getNow() {
  if (!USE_TEST_DATE) return new Date();
  const testHour = getTestHour();
  const d = new Date(`${getTestDate()}T12:00:00`);
  if (testHour !== null) d.setHours(testHour, 0, 0, 0);
  return d;
}

export function getNowAt(hour = 12, minute = 0, second = 0, ms = 0) {
  const d = getNow();
  if (!USE_TEST_DATE) d.setHours(hour, minute, second, ms);
  return d;
}

export function getDateString(dateStr) {
  if (dateStr) return dateStr;
  if (USE_TEST_DATE) return getTestDate();
  return new Date().toISOString().split('T')[0];
}

export function getBaseDate(dateStr) {
  return new Date(`${getDateString(dateStr)}T12:00:00`);
}

/**
 * ✅ FIX: los límites se construyen en UTC puro (con Z) para que coincidan
 * con cómo MongoDB guarda las fechas (siempre UTC).
 * Antes usaba hora local → inicioDia quedaba 3hs adelantado en UTC-3,
 * dejando fuera fechas guardadas como 2026-03-05T00:00:00Z.
 */
export function getDayRange(dateStr) {
  const base      = getBaseDate(dateStr);
  const yyyy      = base.getFullYear();
  const mm        = String(base.getMonth() + 1).padStart(2, '0');
  const dd        = String(base.getDate()).padStart(2, '0');

  const inicioDia = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  const finDia    = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`);

  return { base, inicioDia, finDia };
}

export function sameDayLocal(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth()    === dateB.getMonth()    &&
    dateA.getDate()     === dateB.getDate()
  );
}
