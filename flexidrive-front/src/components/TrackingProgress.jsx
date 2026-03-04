// flexidrive-front/src/components/TrackingProgress.jsx

const STEPS = [
  { key: "solicitado", label: "Envío solicitado" },
  { key: "en_retiro", label: "En retiro" },
  { key: "en_camino", label: "En camino" },
  { key: "entregado", label: "Entregado" },
];

function stepPercent(i) {
  const n = STEPS.length;
  if (n <= 1) return 0;
  return (i / (n - 1)) * 100;
}

function anchorClass(i) {
  if (i === 0) return "translate-x-0";
  if (i === STEPS.length - 1) return "-translate-x-full";
  return "-translate-x-1/2";
}

export default function TrackingProgress({ progreso = "solicitado" }) {
  const idxRaw = STEPS.findIndex((s) => s.key === progreso);
  const idx = Math.max(0, idxRaw === -1 ? 0 : idxRaw);

  // ✅ La barra se pinta hasta el punto del paso actual
  const percent = stepPercent(idx);

  return (
    <div className="rounded-xl border bg-white p-6">
      {/* Labels: posicionados EXACTO arriba del punto */}
      <div className="relative h-6">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={[
              "absolute top-0 text-sm font-semibold transition-colors duration-500",
              i <= idx ? "text-blue-700" : "text-slate-400",
              anchorClass(i),
            ].join(" ")}
            style={{ left: `${stepPercent(i)}%` }}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Barra + puntos */}
      <div className="relative mt-3 h-10">
        {/* Track gris */}
        <div className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-slate-200" />

        {/* Fill azul (animado) */}
        <div
          className="absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-blue-600 transition-[width] duration-700 ease-in-out"
          style={{ width: `${percent}%` }}
        />

        {/* Círculos exactamente en los mismos puntos */}
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={["absolute top-1/2 -translate-y-1/2", anchorClass(i)].join(" ")}
            style={{ left: `${stepPercent(i)}%` }}
          >
            <div
              className={[
                "h-6 w-6 rounded-full bg-white border-4 transition-colors duration-500",
                i <= idx ? "border-blue-600" : "border-slate-300",
              ].join(" ")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}