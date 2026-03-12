// flexidrive-front/src/components/Navbar.jsx

import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Search, UserCircle2 } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";

import logo from "../assets/color-logo.png";
import arFlag from "../assets/ar-flag.svg";
import ukFlag from "../assets/uk-flag.svg";

import useScrolled from "../hooks/useScrolled";
import { getMyProfile } from "../services/profileService/profileService";

const LS_PROFILE_PHOTO_KEY = "flexidrive_profile_photo";

function getProfilePhoto() {
  try {
    return localStorage.getItem(LS_PROFILE_PHOTO_KEY) || "";
  } catch {
    return "";
  }
}

export default function Navbar() {
  const scrolled = useScrolled(10);
  const navigate = useNavigate();
  const location = useLocation();

  const base = "text-slate-500 hover:text-slate-900 transition";
  const active = "font-semibold text-blue-700";

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(
    localStorage.getItem("username") || "Mi cuenta"
  );
  const [profilePhoto, setProfilePhoto] = useState(getProfilePhoto());

  const menuRef = useRef(null);

  const isLoggedIn = !!localStorage.getItem("token");
  const rol = useMemo(() => localStorage.getItem("rol") || "", [location.pathname]);

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/buscar?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    const onClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let alive = true;

    async function syncUserButton() {
      if (!isLoggedIn) {
        if (!alive) return;
        setDisplayName("Mi cuenta");
        setProfilePhoto("");
        return;
      }

      try {
        const profile = await getMyProfile();
        if (!alive) return;

        const name =
          `${profile?.nombre || ""} ${profile?.apellido || ""}`.trim() ||
          profile?.nombre ||
          localStorage.getItem("username") ||
          "Mi cuenta";

        setDisplayName(name);
        localStorage.setItem("username", profile?.nombre || name);
      } catch {
        if (!alive) return;
        setDisplayName(localStorage.getItem("username") || "Mi cuenta");
      }

      setProfilePhoto(getProfilePhoto());
    }

    syncUserButton();

    return () => {
      alive = false;
    };
  }, [location.pathname, isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    localStorage.removeItem(LS_PROFILE_PHOTO_KEY);

    setMenuOpen(false);
    navigate("/auth/login", { replace: true });
  };

  const perfilPath = rol === "cliente" ? "/cliente/datos" : "/comisionista/perfil";

  const getDashboardPath = () => {
    if (!isLoggedIn) return "/";

    switch (rol) {
      case "cliente":
        return "/cliente/dashboard";
      case "comisionista":
        return "/comisionista/dashboard";
      case "admin":
        return "/admin";
      default:
        return "/";
    }
  };

  const goInicio = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    navigate(getDashboardPath());
  };

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
      {/* Barra superior idioma */}
      <div className="w-full px-4 h-8 flex items-center justify-between border-b border-slate-200">

        <div className="flex items-center gap-3 text-xs text-slate-500">

          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-700">
            <img src={arFlag} alt="Argentina" className="w-4 h-4" />
            <span>ES</span>
          </div>

          <span className="inline-block h-3 w-px bg-slate-300" />

          <div className="flex items-center gap-1 cursor-pointer hover:text-slate-700">
            <img src={ukFlag} alt="English" className="w-4 h-4" />
            <span>EN</span>
          </div>

        </div>

      </div>

      {/* Navbar principal */}
      <div className="relative w-full h-16 flex items-center px-4">

        {/* Logo */}
        <Link to="/" onClick={goLogo} className="flex items-center">
          <img src={logo} alt="FlexiDrive" className="h-20 object-contain" />
        </Link>

        {/* Navegación */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-10">

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

          {/* <button className={`${base} flex items-center gap-1`} type="button">
            Usuarios <ChevronDown size={16} />
          </button> */}

          <NavLink
            to="/quienes-somos"
            className={({ isActive }) => `${base} ${isActive ? active : ""}`}
          >
            Quiénes somos
          </NavLink>

        </nav>

        {/* Lado derecho */}
        <div className="ml-auto flex items-center gap-4">

          {/* Buscador */}
          {isLoggedIn && (
            <form onSubmit={onSearch} className="hidden md:flex items-center">
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
          )}

          {/* Usuario */}
          {isLoggedIn ? (
            <div className="relative" ref={menuRef}>

              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm hover:bg-slate-50 transition"
              >

                <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-blue-800 flex items-center justify-center shrink-0">

                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <UserCircle2 className="h-7 w-7 text-blue-700" />
                  )}

                </div>

                <span className="hidden sm:inline font-semibold text-sm max-w-[160px] truncate">
                  {displayName}
                </span>

                <ChevronDown className="w-4 h-4 text-slate-500" />

              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">

                  <Link
                    to={perfilPath}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Ver perfil
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    Cerrar sesión
                  </button>

                </div>
              )}

            </div>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Iniciar sesión
              </Link>

              <Link
                to="/auth/register"
                className="inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Registrarse
              </Link>
            </>
          )}

        </div>

      </div>
    </header>
  );
}