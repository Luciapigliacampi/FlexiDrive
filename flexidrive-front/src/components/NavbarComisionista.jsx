import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Bell, Mail, Search, User, ChevronDown, CheckCheck, Package, XCircle, Truck, MapPin, Tag, Info } from "lucide-react";
import useNotificaciones from "../hooks/useNotificaciones";

const TIPO_ICON = {
  ENVIO_ACEPTADO:                   { icon: CheckCheck, color: "text-green-600"  },
  ESTADO_ACTUALIZADO:               { icon: Truck,      color: "text-blue-600"   },
  RETIRO_CONFIRMADO:                { icon: Package,    color: "text-indigo-600" },
  ENVIO_CANCELADO_POR_COMISIONISTA: { icon: XCircle,    color: "text-red-600"    },
  ENVIO_CANCELADO_POR_CLIENTE:      { icon: XCircle,    color: "text-red-600"    },
  PAGO_CONFIRMADO:                  { icon: CheckCheck, color: "text-emerald-600"},
  PROMOCION:                        { icon: Tag,        color: "text-amber-600"  },
  NUEVO_ENVIO_DISPONIBLE:           { icon: MapPin,     color: "text-blue-600"   },
  RECORDATORIO_ENTREGAS:            { icon: Bell,       color: "text-orange-600" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60_000);
  const hs   = Math.floor(min / 60);
  if (min < 1)  return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  if (hs  < 24) return `Hace ${hs} h`;
  return `Hace ${Math.floor(hs / 24)} d`;
}

export default function NavbarComisionista() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Usuario";

  const [q, setQ] = useState("");
  const [openUser, setOpenUser] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);

  const userRef = useRef(null);
  const notifRef = useRef(null);

  const { notificaciones, noLeidasCount, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const latestNotifications = notificaciones.slice(0, 3);

  function onSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/comisionista/envios?q=${encodeURIComponent(q)}`);
  }

  function logout() {
    localStorage.clear();
    navigate("/auth/login", { replace: true });
  }

  function goToNotifications() {
    setOpenNotif(false);
    navigate("/comisionista/notificaciones");
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (userRef.current  && !userRef.current.contains(e.target))  setOpenUser(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4">
      {/* Search */}
      <form onSubmit={onSearch} className="flex-1 max-w-xl">
        <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar envío / cliente / dirección"
            className="w-full outline-none text-sm text-slate-700"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-4">
        {/* Notificaciones */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => { setOpenNotif((v) => !v); setOpenUser(false); }}
            className="relative p-2 rounded-md hover:bg-slate-100 transition"
          >
            <Bell className="h-5 w-5 text-slate-600" />
            {noLeidasCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {noLeidasCount}
              </span>
            )}
          </button>

          {openNotif && (
            <div className="absolute right-0 mt-2 w-96 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Notificaciones</h3>
                <div className="flex items-center gap-3">
                  {noLeidasCount > 0 && (
                    <button
                      type="button"
                      onClick={marcarTodasLeidas}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Leídas
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={goToNotifications}
                    className="text-xs font-medium text-blue-700 hover:text-blue-800"
                  >
                    Ver más
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {latestNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500 text-center">
                    No tenés notificaciones.
                  </div>
                ) : (
                  latestNotifications.map((item) => {
                    const cfg  = TIPO_ICON[item.tipo] || { icon: Info, color: "text-slate-500" };
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => { marcarLeida(item._id); goToNotifications(); }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition ${!item.leida ? "bg-blue-50/40" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm text-slate-800 truncate ${!item.leida ? "font-semibold" : ""}`}>
                                {item.titulo}
                              </p>
                              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                {timeAgo(item.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">{item.contenido}</p>
                          </div>
                          {!item.leida && (
                            <span className="mt-1.5 block h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <button className="p-2 rounded-md hover:bg-slate-100">
          <Mail className="h-5 w-5 text-slate-600" />
        </button>

        {/* User */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setOpenUser((v) => !v); setOpenNotif(false); }}
            className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1 hover:bg-slate-100"
          >
            <div className="h-9 w-9 rounded-full bg-blue-100 grid place-items-center">
              <User className="h-5 w-5 text-blue-800" />
            </div>
            <span className="font-semibold text-slate-700">{username}</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>

          {openUser && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg z-50">
              <button
                onClick={() => navigate("/comisionista/perfil")}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
              >
                Ver perfil
              </button>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
