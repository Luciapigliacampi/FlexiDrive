// flexidrive-front/src/pages/comisionista/Notificaciones.jsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Package, XCircle, Truck, MapPin, Tag, Info, Trash2 } from 'lucide-react';
import useNotificaciones from '../../hooks/useNotificaciones';

const TIPO_ICON = {
  ENVIO_ACEPTADO:                   { icon: CheckCheck, color: 'text-green-600',  bg: 'bg-green-50'  },
  ESTADO_ACTUALIZADO:               { icon: Truck,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
  RETIRO_CONFIRMADO:                { icon: Package,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ENVIO_CANCELADO_POR_COMISIONISTA: { icon: XCircle,    color: 'text-red-600',    bg: 'bg-red-50'    },
  ENVIO_CANCELADO_POR_CLIENTE:      { icon: XCircle,    color: 'text-red-600',    bg: 'bg-red-50'    },
  PAGO_CONFIRMADO:                  { icon: CheckCheck, color: 'text-emerald-600',bg: 'bg-emerald-50'},
  PROMOCION:                        { icon: Tag,        color: 'text-amber-600',  bg: 'bg-amber-50'  },
  NUEVO_ENVIO_DISPONIBLE:           { icon: MapPin,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
  RECORDATORIO_ENTREGAS:            { icon: Bell,       color: 'text-orange-600', bg: 'bg-orange-50' },
};

function getNotifRoute(notif) {
  const ref = notif.referenciaId || notif.envioId || notif.referencia;
  switch (notif.tipo) {
    case 'ENVIO_ACEPTADO':
    case 'ESTADO_ACTUALIZADO':
    case 'RETIRO_CONFIRMADO':
    case 'ENVIO_CANCELADO_POR_COMISIONISTA':
    case 'ENVIO_CANCELADO_POR_CLIENTE':
    case 'NUEVO_ENVIO_DISPONIBLE':
      return ref ? `/comisionista/envios/${ref}` : '/comisionista/envios';
    case 'RECORDATORIO_ENTREGAS':
      return '/comisionista/dashboard';
    case 'PAGO_CONFIRMADO':
      return '/comisionista/ganancias';
    default:
      return null;
  }
}

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
  const navigate = useNavigate();
  const {
    noLeidasCount,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion,  // PATCH visible:false — mismo que usa el navbar
    eliminarTodas,         // PATCH visible:false masivo
    fetchTodasNotificaciones,
  } = useNotificaciones();

  // Lista propia — incluye visibles e invisibles
  const [lista, setLista]       = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const data = await fetchTodasNotificaciones();
    setLista(data);
    setCargando(false);
  }, [fetchTodasNotificaciones]);

  useEffect(() => { cargar(); }, [cargar]);

  function handleClick(n) {
    if (!n.leida) marcarLeida(n._id);
    const route = getNotifRoute(n);
    if (route) navigate(route);
  }

  async function handleBorrar(e, id) {
    e.stopPropagation();
    // Optimistic: marcar como oculta en la lista local (sin sacarla)
    setLista((prev) => prev.map((n) => n._id === id ? { ...n, visible: false } : n));
    await eliminarNotificacion?.(id);
  }

  async function handleBorrarTodas() {
    setLista((prev) => prev.map((n) => ({ ...n, visible: false })));
    await eliminarTodas?.();
  }

  const hayVisibles = lista.some((n) => n.visible !== false);

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

        <div className="flex items-center gap-3">
          {noLeidasCount > 0 && (
            <button
              onClick={marcarTodasLeidas}
              className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 font-medium transition"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
          {hayVisibles && (
            <button
              onClick={handleBorrarTodas}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition"
            >
              <Trash2 className="w-4 h-4" />
              Borrar todas
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {cargando && (
          <div className="p-10 text-center text-slate-400 text-sm">Cargando…</div>
        )}

        {!cargando && lista.length === 0 && (
          <div className="p-10 text-center text-slate-500">
            No tenés notificaciones.
          </div>
        )}

        {!cargando && lista.map((n) => {
          const cfg    = TIPO_ICON[n.tipo] || { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50' };
          const Icon   = cfg.icon;
          const route  = getNotifRoute(n);
          const oculta = n.visible === false;

          return (
            <button
              key={n._id}
              onClick={() => !oculta && handleClick(n)}
              className={`w-full text-left flex items-start gap-4 p-5 border-b last:border-b-0 transition group
                ${oculta
                  ? 'opacity-40 cursor-default'
                  : route ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default hover:bg-slate-50'}
                ${!n.leida && !oculta ? 'bg-blue-50/40' : ''}`}
            >
              {/* Ícono */}
              <div className={`mt-0.5 p-2 rounded-xl ${cfg.bg} shrink-0`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm text-slate-800 ${!n.leida && !oculta ? 'font-bold' : 'font-semibold'}`}>
                    {n.titulo}
                  </p>
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{n.contenido}</p>
              </div>

              {/* Acciones */}
              <div className="flex flex-col items-center gap-2 shrink-0 mt-1">
                {!n.leida && !oculta && (
                  <span className="block h-2.5 w-2.5 rounded-full bg-blue-600" />
                )}
                {!oculta && (
                  <button
                    type="button"
                    title="Borrar notificación"
                    onClick={(e) => handleBorrar(e, n._id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
