// microservicios/ia-route-service/src/utils/testDate.js
// ─── Lee SIEMPRE desde process.env en cada llamada.
//     Así el endpoint PATCH /api/test/config puede cambiar fecha/hora sin reiniciar.

export function getNow() {
  if (process.env.USE_TEST_DATE !== 'true') return new Date();

  const base = process.env.TEST_DATE || '2026-03-06';
  const hour = parseInt(process.env.TEST_HOUR ?? '8', 10);

  const [y, m, d] = base.split('-').map(Number);
  return new Date(y, m - 1, d, isNaN(hour) ? 8 : hour, 0, 0, 0);
}

export function getDateString(dateStr) {
  if (dateStr) return dateStr;
  if (process.env.USE_TEST_DATE === 'true') return process.env.TEST_DATE || '2026-03-06';
  return new Date().toISOString().split('T')[0];
}

export function getDate(dateStr) {
  const s = getDateString(dateStr);
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}