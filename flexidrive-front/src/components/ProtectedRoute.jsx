// flexidrive-front/src/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

// ✅ Decodifica el payload del JWT sin librería externa
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    // Padding base64
    const padded = payload + "=".repeat((4 - payload.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const USE_MOCK = (import.meta.env.VITE_USE_MOCK || "false") === "true";

  const token = localStorage.getItem("token");

  // Modo demo
  if (USE_MOCK) {
    const rol = localStorage.getItem("rol");
    if (!rol && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      localStorage.setItem("rol", allowedRoles[0]);
    }
    return <Outlet />;
  }

  // Sin token → login
  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  // ✅ Decodificar el token para obtener el rol real
  const decoded = decodeToken(token);

  // Token inválido o expirado
  if (!decoded) {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  // Token expirado (exp está en segundos)
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  // ✅ Sincronizar localStorage con el rol real del token
  // (así el resto de la app que lee localStorage sigue funcionando)
  const rolDelToken = decoded.rol || decoded.role || null;
  if (rolDelToken) {
    localStorage.setItem("rol", rolDelToken);
  }

  // Validar rol si la ruta lo requiere
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!rolDelToken || !allowedRoles.includes(rolDelToken)) {
      // ✅ Redirigir al dashboard correcto según su rol real
      if (rolDelToken === "comisionista") {
        return <Navigate to="/comisionista/dashboard" replace />;
      }
      if (rolDelToken === "cliente") {
        return <Navigate to="/cliente/dashboard" replace />;
      }
      return <Navigate to="/select-rol" replace />;
    }
  }

  return <Outlet />;
}