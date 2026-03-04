import { ESTADOS_ENVIO, ESTADO_FALLBACK } from "../config/estadosEnvio";

export default function StatusBadge({ estado, label, showIcon = false }) {
  const s = ESTADOS_ENVIO[estado] || ESTADO_FALLBACK;
  const Icon = s.Icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${s.cls}`}
    >
      {showIcon && Icon ? <Icon className="h-4 w-4" /> : null}
      {label || s.label || estado}
    </span>
  );
}