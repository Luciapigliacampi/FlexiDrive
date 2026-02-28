//flexidrive-front\src\components\StatusBadge.jsx

export default function StatusBadge({ estado }) {
  const map = {
    pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
    en_retiro: { label: "En retiro", cls: "bg-indigo-100 text-indigo-700" },
    en_camino: { label: "En camino", cls: "bg-blue-600 text-white" },
    entregado: { label: "Entregado", cls: "bg-emerald-600 text-white" },
    cancelado: { label: "Cancelado", cls: "bg-red-600 text-white" },
    demorado: { label: "Demorado", cls: "bg-orange-500 text-white" },
  };
  const s = map[estado] || { label: estado, cls: "bg-slate-200 text-slate-700" };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
