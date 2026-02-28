const STEPS = [
  { key: "solicitado", label: "Envío solicitado" },
  { key: "en_retiro", label: "En retiro" },
  { key: "en_camino", label: "En camino" },
  { key: "entregado", label: "Entregado" },
];

export default function TrackingProgress({ progreso = "solicitado" }) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === progreso));
  const percent = (idx / (STEPS.length - 1)) * 100;

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
        {STEPS.map((s, i) => (
          <span key={s.key} className={i <= idx ? "text-blue-700" : "text-slate-400"}>
            {s.label}
          </span>
        ))}
      </div>

      <div className="mt-4 h-3 w-full rounded-full bg-slate-200">
        <div className="h-3 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-col items-center gap-2">
            <div className={`h-5 w-5 rounded-full border-4 ${i <= idx ? "border-blue-600" : "border-slate-300"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
