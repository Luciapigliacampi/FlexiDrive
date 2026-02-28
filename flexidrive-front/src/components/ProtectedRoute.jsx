// flexidrive-front/src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  const USE_MOCK = (import.meta.env.VITE_USE_MOCK || "false") === "true";

  const token = localStorage.getItem("token");
  const rol = localStorage.getItem("rol");

  // ✅ Si estás en mock, permitimos entrar sin token (modo demo)
  if (USE_MOCK) {
    // si no hay rol seteado, asumimos comisionista (o cliente) según allowedRoles
    if (!rol && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      localStorage.setItem("rol", allowedRoles[0]);
    }
    return <Outlet />;
  }

  // ✅ Modo real: exige token
  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  // ✅ Si se especificaron roles permitidos, validamos
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!rol || !allowedRoles.includes(rol)) {
      return <Navigate to="/select-rol" replace />;
    }
  }

  return <Outlet />;
}