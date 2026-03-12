// flexidrive-front/src/config/estadosEnvio.js
import {
  Clock, PackageCheck, PackageSearch, Truck, CheckCircle2,
  XCircle, AlertTriangle, Archive, UserCheck, PackageOpen,
} from "lucide-react";

export const ESTADOS_ENVIO = {
  pendiente: {
    key: "pendiente", label: "Pendiente",
    cls: "bg-amber-100 text-amber-700", Icon: Clock, order: 10,
  },
  asignado: {
    key: "asignado", label: "Aceptado",
    cls: "bg-blue-100 text-blue-700", Icon: UserCheck, order: 20,
  },
  retirado: {
    key: "retirado", label: "Retirado",
    cls: "bg-violet-100 text-violet-700", Icon: PackageOpen, order: 25,
  },
  en_retiro: {
    key: "en_retiro", label: "En retiro",
    cls: "bg-indigo-100 text-indigo-700", Icon: PackageSearch, order: 30,
  },
  en_camino: {
    key: "en_camino", label: "En camino",
    cls: "bg-blue-600 text-white", Icon: Truck, order: 40,
  },
  // ── Estados demorados ────────────────────────────────────────────────────────
  // El viaje anterior terminó sin completar esta parada.
  // Aparecen en la grilla y en la ruta del día siguiente hasta que se completen.
  demorado_retiro: {
    key: "demorado_retiro", label: "Demorado",
    cls: "bg-orange-500 text-white", Icon: AlertTriangle, order: 45,
  },
  demorado_entrega: {
    key: "demorado_entrega", label: "Demorado",
    cls: "bg-orange-500 text-white", Icon: AlertTriangle, order: 46,
  },
  // ── Estados finales ──────────────────────────────────────────────────────────
  entregado: {
    key: "entregado", label: "Entregado",
    cls: "bg-emerald-600 text-white", Icon: CheckCircle2, order: 50, isFinal: true,
  },
  cancelado: {
    key: "cancelado", label: "Cancelado",
    cls: "bg-red-600 text-white", Icon: XCircle, order: 90, isFinal: true,
  },
  cancelado_retorno: {
    key: "cancelado_retorno", label: "Rumbo origen",
    cls: "bg-red-500 text-white", Icon: XCircle, order: 95, isFinal: false,
  },
  devuelto: {
    key: "devuelto", label: "Devuelto",
    cls: "bg-slate-600 text-white", Icon: PackageCheck, order: 96, isFinal: true,
  },
  archivado: {
    key: "archivado", label: "Archivado",
    cls: "bg-slate-200 text-slate-700", Icon: Archive, order: 999, isFinal: true,
  },
};

export const ESTADO_FALLBACK = {
  label: "Desconocido", cls: "bg-slate-200 text-slate-700", Icon: PackageCheck, order: 0,
};
