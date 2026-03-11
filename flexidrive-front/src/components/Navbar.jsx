import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Search, UserCircle2, Bell, CheckCheck, Package, XCircle, Truck, MapPin, Tag, Info } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import logo from "../assets/color-logo.png";
import arFlag from "../assets/ar-flag.svg";
import useScrolled from "../hooks/useScrolled";
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

export default function Navbar() {
  const scrolled = useScrolled(10);
  const navigate = useNavigate();

  const base   = "text-slate-500 hover:text-slate-900 transition";
  const active = "font-semibold text-blue-700";

  // ===== Search =====
  const [query, setQuery] = useState("");
  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/buscar?q=${encodeURIComponent(q)}`);
  };

  // ===== Dropdowns =====
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef  = useRef(null);
  const notifRef = useRef(null);

  const location   = useLocation();
  const isLoggedIn = !!localStorage.getItem("token");
  const username   = localStorage.getItem("username");
  const rol        = useMemo(() => localStorage.getItem("rol") || "", [location.pathname]);

  // ===== Notificaciones reales =====
  const { notificaciones, noLeidasCount, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const latestNotifications = notificaciones.slice(0, 3);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    setMenuOpen(false);
    setNotifOpen(false);
    navigate("/auth/login", { replace: true });
  };

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // const perfilPath   = rol === "cliente" ? "/cliente/perfil"    : "/comisionista/perfil";
  const misDatosPath = rol === "cliente" ? "/cliente/datos"     : "/comisionista/datos";

  const getDashboardPath = () => {
    if (!isLoggedIn) return "/";
    switch (rol) {
      case "cliente":       return "/cliente/dashboard";
      case "comisionista":  return "/comisionista/Dashboard";
      case "admin":         return "/admin";
      default:              return "/";
    }
  };

  const goToNotifications = () => {
    setNotifOpen(false);
    navigate("/notificaciones");
  };

  const goInicio = (e) => { e.preventDefault(); setMenuOpen(false); setNotifOpen(false); navigate(getDashboardPath()); };
  const goLogo   = (e) => { e.preventDefault(); setMenuOpen(false); setNotifOpen(false); navigate(getDashboardPath()); };

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full border-b",
        "transition-all duration-300",
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-md border-slate-200"
          : "bg-white border-slate-200",
      ].join(" ")}
    >
      {/* FILA 1 — Idioma + Perfil */}
      <div className="w-full px-4 h-8 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center text-xs text-slate-500">
          <img src={arFlag} alt="Argentina" className="w-4 h-4 mr-2" />
          <span>ARG - ES</span>
          <span className="mx-3 inline-block h-3 w-px bg-slate-300" />
          <button className="hover:text-slate-700">EN</button>
        </div>

        {isLoggedIn && (
          <div className="relative z-50" ref={menuRef}>
            <button
              type="button"
              onClick={() => { setMenuOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-700"
            >
              <UserCircle2 className="w-5 h-5" />
              <span className="hidden sm:inline font-semibold">{username}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                <Link
                  to={misDatosPath}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Ver perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FILA 2 — Logo + menú centrado + acciones derecha */}
      <div className="relative w-full h-16 flex items-center px-4">
        {/* LOGO */}
        <Link to="/" onClick={goLogo} className="flex items-center">
          <img src={logo} alt="FlexiDrive" className="h-20 object-contain" />
        </Link>

        {/* MENÚ centrado */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-10">
          <NavLink
            to={getDashboardPath()}
            end
            onClick={goInicio}
            className={({ isActive }) => `${base} ${isActive ? active : ""}`}
          >
            Inicio
          </NavLink>
          <NavLink to="/novedades" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
            Novedades
          </NavLink>
          <button className={`${base} flex items-center gap-1`} type="button">
            Usuarios <ChevronDown size={16} />
          </button>
          <NavLink to="/quienes-somos" className={({ isActive }) => `${base} ${isActive ? active : ""}`}>
            Quiénes somos
          </NavLink>
        </nav>

        {isLoggedIn && (
          <div className="ml-auto hidden md:flex items-center gap-3">
            {/* Notificaciones */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => { setNotifOpen((v) => !v); setMenuOpen(false); }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                {noLeidasCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {noLeidasCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-96 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
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

            {/* Search */}
            <form onSubmit={onSearch} className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-slate-300 bg-white px-3 py-2">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="ml-2 w-44 lg:w-56 outline-none text-sm"
                />
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
