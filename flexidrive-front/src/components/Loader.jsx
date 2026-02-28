export default function Loader({ label = "Cargando..." }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border bg-white p-6">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}
