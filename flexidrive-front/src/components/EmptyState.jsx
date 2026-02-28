export default function EmptyState({ title = "Sin resultados", subtitle = "Probá cambiando filtros o búsqueda." }) {
  return (
    <div className="rounded-xl border bg-white p-8 text-center">
      <div className="text-xl font-semibold text-slate-800">{title}</div>
      <div className="mt-2 text-slate-500">{subtitle}</div>
    </div>
  );
}
