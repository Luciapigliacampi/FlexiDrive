//flexidrive-front\src\components\Sidebar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Package, Route, CalendarDays, Wallet, User, Settings, Car } from "lucide-react";
import logo from "../assets/white-logo.png";

export default function SidebarComisionista() {
    const linkBase =
        "flex items-center gap-3 px-5 py-3 text-white/90 hover:bg-white/10 transition";
    const linkActive = "bg-white/15 font-semibold";

    const items = [
        { to: "/comisionista/dashboard", label: "Inicio", icon: Home },
        { to: "/comisionista/envios", label: "Envíos", icon: Package },
        { to: "/comisionista/rutas", label: "Gestión De Rutas", icon: Route },
        { to: "/comisionista/vehiculos", label: "Vehículos", icon: Car },
        { to: "/comisionista/calendario", label: "Calendario", icon: CalendarDays },
        { to: "/comisionista/ganancias", label: "Ganancias", icon: Wallet },
        { to: "/comisionista/perfil", label: "Perfil", icon: User },
        { to: "/comisionista/ajustes", label: "Ajustes", icon: Settings },
    ];
    
 const rol = localStorage.getItem("rol") || "";

    
      const isLoggedIn = !!localStorage.getItem("token");

    const getDashboardPath = () => {
    if (!isLoggedIn) return "/";

   switch (rol) {
    case "cliente":
      return "/cliente/dashboard";
    case "comisionista":
      return "/comisionista/Dashboard";
    case "admin":
      return "/admin"; 
    default:
      return "/";
    }
  };

   const navigate = useNavigate();

     // (Opcional) si querés que el logo también respete el dashboard:
  const goLogo = (e) => {
    e.preventDefault();
    navigate(getDashboardPath());
  };


    return (
        <aside className="w-64 bg-blue-800 text-white hidden md:flex flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
                {/* LOGO */}
                {/* ✅ si querés que el logo vaya al dashboard, usá onClick={goLogo} */}
                <Link to="/" onClick={goLogo} className="flex items-center">
                    <img src={logo} alt="FlexiDrive" className="h-20 object-contain" />
                </Link>
            </div>

            {/* Menu */}
            <nav className="py-3">
                {items.map((it) => {
                    const Icon = it.icon;
                    return (
                        <NavLink
                            key={it.to}
                            to={it.to}
                            className={({ isActive }) =>
                                `${linkBase} ${isActive ? linkActive : ""}`
                            }
                        >
                            <Icon className="h-5 w-5" />
                            <span>{it.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="mt-auto p-5 text-xs text-white/70">
                © {new Date().getFullYear()} FlexiDrive
            </div>
        </aside>
    );
}