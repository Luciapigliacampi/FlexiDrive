//microservicios\viajes-service\src\utils\dayOfWeek.js
export function dayOfWeekFromISODate(yyyy_mm_dd) {
  // yyyy-mm-dd en local
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getDay(); // 0..6
}