// microservicios/envio-service/src/utils/testDate.js
// IMPORTANTE: No usar constantes de módulo para process.env.
// Con ES modules, los imports se hoistan ANTES de que dotenv.config() corra,
// por eso USE_TEST_DATE siempre era false aunque el .env tuviera USE_TEST_DATE=true.
// Solución: leer process.env dentro de cada función, nunca al nivel del módulo.

export const TEST_DATE_DEFAULT = '2026-03-04';

function isTestMode()  { return process.env.USE_TEST_DATE === 'true'; }
function getTestHour() {
  const raw = process.env.TEST_HOUR;
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}
function getTestDate() { return process.env.TEST_DATE || TEST_DATE_DEFAULT; }

export function getNow() {
  if (!isTestMode()) return new Date();
  const testHour = getTestHour();
  const d = new Date(`${getTestDate()}T12:00:00`);
  if (testHour !== null) d.setHours(testHour, 0, 0, 0);
  return d;
}

export function getNowAt(hour = 12, minute = 0, second = 0, ms = 0) {
  const d = getNow();
  if (!isTestMode()) d.setHours(hour, minute, second, ms);
  return d;
}

export function getDateString(dateStr) {
  if (dateStr) return dateStr;
  if (isTestMode()) return getTestDate();
  return new Date().toISOString().split('T')[0];
}

export function getBaseDate(dateStr) {
  return new Date(`${getDateString(dateStr)}T12:00:00`);
}

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