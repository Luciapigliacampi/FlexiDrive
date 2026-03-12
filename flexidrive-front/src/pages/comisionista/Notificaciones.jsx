import { Bell, CheckCheck, Package, XCircle, Truck, MapPin, Tag, Info } from 'lucide-react';
import useNotificaciones from '../../hooks/useNotificaciones';

const TIPO_ICON = {
  ENVIO_ACEPTADO:                   { icon: CheckCheck, color: 'text-green-600',  bg: 'bg-green-50' },
  ESTADO_ACTUALIZADO:               { icon: Truck,      color: 'text-blue-600',   bg: 'bg-blue-50'  },
  RETIRO_CONFIRMADO:                { icon: Package,    color: 'text-indigo-600', bg: 'bg-indigo-50'},
  ENVIO_CANCELADO_POR_COMISIONISTA: { icon: XCircle,    color: 'text-red-600',    bg: 'bg-red-50'   },
  ENVIO_CANCELADO_POR_CLIENTE:      { icon: XCircle,    color: 'text-red-600',    bg: 'bg-red-50'   },
  PAGO_CONFIRMADO:                  { icon: CheckCheck, color: 'text-emerald-600',bg: 'bg-emerald-50'},
  PROMOCION:                        { icon: Tag,        color: 'text-amber-600',  bg: 'bg-amber-50' },
  NUEVO_ENVIO_DISPONIBLE:           { icon: MapPin,     color: 'text-blue-600',   bg: 'bg-blue-50'  },
  RECORDATORIO_ENTREGAS:            { icon: Bell,       color: 'text-orange-600', bg: 'bg-orange-50'},
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60_000);
  const hs   = Math.floor(min / 60);
  const dias = Math.floor(hs / 24);
  if (min < 1)  return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  if (hs  < 24) return `Hace ${hs} h`;
  return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
}

export default function PaginaNotificaciones() {
  const { notificaciones, loading, noLeidasCount, marcarLeida, marcarTodasLeidas } =
    useNotificaciones();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-bold text-slate-800">Notificaciones</h1>
          {noLeidasCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
              {noLeidasCount}
            </span>
          )}
        </div>
        {noLeidasCount > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 font-medium transition"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && (
          <div className="p-10 text-center text-slate-400 text-sm">Cargando…</div>
        )}

        {!loading && notificaciones.length === 0 && (
          <div className="p-10 text-center text-slate-500">
            No tenés notificaciones.
          </div>
        )}

        {!loading && notificaciones.map((n) => {
          const cfg = TIPO_ICON[n.tipo] || { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50' };
          const Icon = cfg.icon;

          return (
            <button
              key={n._id}
              onClick={() => !n.leida && marcarLeida(n._id)}
              className={`w-full text-left flex items-start gap-4 p-5 border-b last:border-b-0 hover:bg-slate-50 transition
                ${!n.leida ? 'bg-blue-50/40' : ''}`}
            >
              {/* Ícono de tipo */}
              <div className={`mt-0.5 p-2 rounded-xl ${cfg.bg} shrink-0`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold text-slate-800 ${!n.leida ? 'font-bold' : ''}`}>
                    {n.titulo}
                  </p>
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{n.contenido}</p>
              </div>

              {/* Punto no leída */}
              {!n.leida && (
                <span className="mt-2 block h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
