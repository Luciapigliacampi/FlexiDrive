export function formatFechaEntrega(isoString) {
  if (!isoString) return "—";

  const d = new Date(isoString);
  if (isNaN(d)) return "—";

  // getUTC* evita que el offset local (UTC-3) reste horas y cambie el día
  const dia  = String(d.getUTCDate()).padStart(2, "0");
  const mes  = String(d.getUTCMonth() + 1).padStart(2, "0");
  const anio = d.getUTCFullYear();

  return `${dia}/${mes}/${anio}`;
}
