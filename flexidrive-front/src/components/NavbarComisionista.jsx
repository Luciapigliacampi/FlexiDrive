//flexidrive-front\src\components\NavbarComisionista.jsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Bell, Mail, Search, User, ChevronDown } from "lucide-react";

export default function NavbarComisionista() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Usuario";

  const [q, setQ] = useState("");
  const [openUser, setOpenUser] = useState(false);

  function onSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/comisionista/envios?q=${encodeURIComponent(q)}`);
  }

  function logout() {
    localStorage.clear();
    navigate("/auth/login", { replace: true });
  }

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
        <button className="p-2 rounded-md hover:bg-slate-100">
          <Bell className="h-5 w-5 text-slate-600" />
        </button>

        <button className="p-2 rounded-md hover:bg-slate-100">
          <Mail className="h-5 w-5 text-slate-600" />
        </button>

        {/* User */}
        <div className="relative">
          <button
            onClick={() => setOpenUser((v) => !v)}
            className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1 hover:bg-slate-100"
          >
            <div className="h-9 w-9 rounded-full bg-blue-100 grid place-items-center">
              <User className="h-5 w-5 text-blue-800" />
            </div>
            <span className="font-semibold text-slate-700">{username}</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>

          {openUser && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg">
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