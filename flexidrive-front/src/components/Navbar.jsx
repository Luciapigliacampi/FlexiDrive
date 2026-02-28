//flexidrive-front\src\components\Navbar.jsx
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Search, UserCircle2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import logo from "../assets/color-logo.png";
import arFlag from "../assets/ar-flag.svg";
import useScrolled from "../hooks/useScrolled";

export default function Navbar() {
  const scrolled = useScrolled(10);
  const navigate = useNavigate();

  const base = "text-slate-500 hover:text-slate-900 transition";
  const active = "font-semibold text-blue-700";

  // ===== Search =====
  const [query, setQuery] = useState("");

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/buscar?q=${encodeURIComponent(q)}`);
  };

  // ===== Perfil dropdown =====
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const location = useLocation(); // fuerza re-render cuando cambia la ruta

  const isLoggedIn = !!localStorage.getItem("token");
  const username = localStorage.getItem("username");

  // 👇 Esto se recalcula al cambiar de ruta (por si el rol cambia tras login/logout)
  const rol = useMemo(() => localStorage.getItem("rol") || "", [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    setMenuOpen(false);
    navigate("/auth/login", { replace: true });
  };

  // Cerrar menú al click afuera
  useEffect(() => {
    const onClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Rutas del dropdown según rol
  const perfilPath = rol === "cliente" ? "/cliente/perfil" : "/comisionista/perfil";
  const misDatosPath = rol === "cliente" ? "/cliente/datos" : "/comisionista/datos";

  // ✅ Dashboard dinámico para "Inicio"
  const getDashboardPath = () => {
    if (!isLoggedIn) return "/";

   switch (rol) {
    case "cliente":
      return "/cliente/dashboard";
    case "comisionista":
      return "/comisionista/DashboardComisionista";
    case "admin":
      return "/admin"; 
    default:
      return "/";
    }
  };

  const goInicio = (e) => {
    // Evita que NavLink intente ir a su "to"
    e.preventDefault();
    setMenuOpen(false);
    navigate(getDashboardPath());
  };

  // (Opcional) si querés que el logo también respete el dashboard:
  const goLogo = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    navigate(getDashboardPath());
  };

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
        {/* Idioma izquierda */}
        <div className="flex items-center text-xs text-slate-500">
          <img src={arFlag} alt="Argentina" className="w-4 h-4 mr-2" />
          <span>ARG - ES</span>

          <span className="mx-3 inline-block h-3 w-px bg-slate-300" />
          <button className="hover:text-slate-700">EN</button>
        </div>

        {/* Perfil derecha (solo si logueado) */}
        {isLoggedIn && (
          <div className="relative z-50" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
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
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-80"
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
        {/* ✅ si querés que el logo vaya al dashboard, usá onClick={goLogo} */}
        <Link to="/" onClick={goLogo} className="flex items-center">
          <img src={logo} alt="FlexiDrive" className="h-20 object-contain" />
        </Link>

        {/* MENÚ centrado */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-10">
          {/* ✅ "Inicio" ahora redirige según rol */}
          <NavLink
            to={getDashboardPath()}
            end
            onClick={goInicio}
            className={({ isActive }) => `${base} ${isActive ? active : ""}`}
          >
            Inicio
          </NavLink>

          <NavLink
            to="/novedades"
            className={({ isActive }) => `${base} ${isActive ? active : ""}`}
          >
            Novedades
          </NavLink>

          <button className={`${base} flex items-center gap-1`} type="button">
            Usuarios <ChevronDown size={16} />
          </button>

          <NavLink
            to="/quienes-somos"
            className={({ isActive }) => `${base} ${isActive ? active : ""}`}
          >
            Quiénes somos
          </NavLink>
        </nav>

        {isLoggedIn && (
          <div className="ml-auto hidden md:flex items-center">
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