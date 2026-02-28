// src/pages/shared/SeleccionRol.jsx
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function SeleccionRol() {
  const navigate = useNavigate();
  const [rol, setRol] = useState(localStorage.getItem("rol") || "cliente");

  useEffect(() => {
    // si no hay token, mandalo al login (por las dudas)
    const token = localStorage.getItem("token");
    if (!token) navigate("/auth/login", { replace: true });
  }, [navigate]);

  function continuar() {
    localStorage.setItem("rol", rol);
    if (rol === "cliente") navigate("/cliente/dashboard");
    if (rol === "comisionista") navigate("/comisionista/dashboard");
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-5xl rounded-2xl border bg-white p-10">
        <h1 className="text-4xl font-bold text-slate-700">Seleccioná tu rol</h1>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <RoleCard
            title="Cliente"
            subtitle="Quiero enviar paquetes"
            checked={rol === "cliente"}
            onSelect={() => setRol("cliente")}
          />

          <RoleCard
            title="Comisionista"
            subtitle="Quiero realizar entregas"
            checked={rol === "comisionista"}
            onSelect={() => setRol("comisionista")}
          />
        </div>

        <div className="mt-10 flex justify-end">
          <button
            onClick={continuar}
            className="rounded-full bg-blue-700 px-10 py-3 text-lg font-semibold text-white hover:bg-blue-800"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ title, subtitle, checked, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-2xl border p-6 text-left hover:bg-slate-50 ${
        checked ? "border-blue-700" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-slate-100" />
        <div>
          <div className="text-xl font-bold text-slate-700">{title}</div>
          <div className="text-slate-500">{subtitle}</div>
        </div>
      </div>

      <div className={`h-6 w-6 rounded-full border-4 ${checked ? "border-blue-700" : "border-slate-300"}`} />
    </button>
  );
}
