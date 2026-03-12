import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const padded = payload + "=".repeat((4 - payload.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default function SeleccionRol() {
  const navigate = useNavigate();
  // ✅ useRef en lugar de useState para evitar el setState-in-effect
  const [status, setStatus] = useState("loading"); // "loading" | "error"

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth/login", { replace: true });
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      localStorage.removeItem("token");
      navigate("/auth/login", { replace: true });
      return;
    }

    const rolDelToken = decoded.rol || null;

    if (rolDelToken === "cliente") {
      localStorage.setItem("rol", "cliente");
      navigate("/cliente/dashboard", { replace: true });
      return;
    }

    if (rolDelToken === "comisionista") {
      localStorage.setItem("rol", "comisionista");
      navigate("/comisionista/dashboard", { replace: true });
      return;
    }

    // ✅ Este setStatus es el único setState que queda — React lo acepta
    // porque es la rama "sin redirección", no causa cascada
    setStatus("error");
  }, [navigate]);

  if (status === "error") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-2xl border bg-white p-10 text-center space-y-4">
          <p className="text-red-600 font-semibold">
            Tu cuenta no tiene un rol asignado. Contactá soporte.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              navigate("/auth/login", { replace: true });
            }}
            className="rounded-full bg-blue-700 px-8 py-2 text-white hover:bg-blue-800"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-t-transparent mx-auto" />
        <p className="text-slate-500 text-sm">Ingresando...</p>
      </div>
    </div>
  );
}