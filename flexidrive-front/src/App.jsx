import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";
import ClienteLayout from "./layouts/ClienteLayout";
import ComisionistaLayout from "./layouts/ComisionistaLayout";

// Public pages
import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import Totp from "./pages/public/Totp";
import CompleteProfile from "./pages/public/CompleteProfile";
import CompleteComisionista from "./pages/public/CompleteComisionista";
import ForgotPassword from "./pages/public/ForgotPassword";
import EmailConfirm from "./pages/public/EmailConfirm";
import Novedades from "./pages/public/Novedades";
import QuienesSomos from "./pages/public/QuienesSomos";
import SeleccionRol from "./pages/shared/SeleccionRol";

// Cliente pages
import DashboardCliente from "./pages/cliente/DashboardCliente";
import SolicitarEnvio from "./pages/cliente/SolicitarEnvio";
import HistorialEnvios from "./pages/cliente/HistorialEnvios";
import TrackingEnvio from "./pages/cliente/TrackingEnvio";
import SeleccionComisionista from "./pages/cliente/SeleccionComisionista";
import MetodosPago from "./pages/cliente/MetodosPago";
import Estadisticas from "./pages/cliente/Estadisticas";
import DireccionesFrecuentes from "./pages/cliente/DireccionesFrecuentes";
import DestinatariosFrecuentes from "./pages/cliente/DestinatariosFrecuentes";
import AyudaSoporte from "./pages/cliente/AyudaSoporte";
import ConfirmacionEnvio from "./pages/cliente/ConfirmacionEnvio";
import PagoEnvio from "./pages/cliente/PagoEnvio";
import CalificarComisionista from "./pages/cliente/CalificarComisionista";
import PerfilCliente from "./pages/cliente/PerfilCliente";
import EditarPerfilCliente from "./pages/cliente/EditarPerfilCliente";
import Notificaciones from "./pages/cliente/Notificaciones";

// Comisionista pages
import DashboardComisionista from "./pages/comisionista/DashboardComisionista";
import EnviosDisponibles from "./pages/comisionista/EnviosDisponibles";
import GestionRutas from "./pages/comisionista/GestionRutas";
import Vehiculos from "./pages/comisionista/Vehiculos";
import TrackingEnvioComisionista from "./pages/comisionista/TrackingEnvio";
import NotificacionesComisionista from "./pages/comisionista/Notificaciones";

// Sistema
import NotFound from "./pages/system/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import TestDatePanel from "./components/TestDatePanel";

export default function App() {
  return (
    <>
      <Routes>
        {/* Públicas */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/forgot" element={<ForgotPassword />} />
          <Route path="/auth/email-confirm" element={<EmailConfirm />} />
          <Route path="/auth/complete-profile" element={<CompleteProfile />} />
          <Route path="/auth/complete-comisionista" element={<CompleteComisionista />} />
          <Route path="/auth/totp" element={<Totp />} />
          <Route path="/novedades" element={<Novedades />} />
          <Route path="/quienes-somos" element={<QuienesSomos />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
          <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        </Route>

        {/* Privadas genéricas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route
              path="/app"
              element={
                <Navigate
                  to={
                    localStorage.getItem("rol") === "comisionista"
                      ? "/comisionista/dashboard"
                      : "/cliente/dashboard"
                  }
                  replace
                />
              }
            />
            <Route path="/select-rol" element={<SeleccionRol />} />
          </Route>
        </Route>

        {/* Cliente */}
        <Route element={<ProtectedRoute allowedRoles={["cliente"]} />}>
          <Route element={<ClienteLayout />}>
            <Route path="/cliente/dashboard" element={<DashboardCliente />} />
            <Route path="/cliente/solicitar-envio" element={<SolicitarEnvio />} />
            <Route path="/cliente/envios" element={<HistorialEnvios />} />
            <Route path="/cliente/envios/:id" element={<TrackingEnvio />} />
            <Route path="/cliente/seleccionar-comisionista" element={<SeleccionComisionista />} />
            <Route path="/cliente/datos" element={<PerfilCliente />} />
            <Route path="/cliente/perfil" element={<PerfilCliente />} />
            <Route path="/cliente/perfil/editar" element={<EditarPerfilCliente />} />
            <Route path="/cliente/metodos-pago" element={<MetodosPago />} />
            <Route path="/cliente/estadisticas" element={<Estadisticas />} />
            <Route path="/cliente/direcciones" element={<DireccionesFrecuentes />} />
            <Route path="/cliente/destinatarios" element={<DestinatariosFrecuentes />} />
            <Route path="/cliente/soporte" element={<AyudaSoporte />} />
            <Route path="/cliente/confirmacion-envio" element={<ConfirmacionEnvio />} />
            <Route path="/cliente/pago" element={<PagoEnvio />} />
            <Route path="/cliente/envios/:id/calificar" element={<CalificarComisionista />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
          </Route>
        </Route>

        {/* Comisionista */}
        <Route element={<ProtectedRoute allowedRoles={["comisionista"]} />}>
          <Route element={<ComisionistaLayout />}>
            <Route path="/comisionista/dashboard" element={<DashboardComisionista />} />
            <Route path="/comisionista/envios" element={<EnviosDisponibles />} />
            <Route path="/comisionista/rutas" element={<GestionRutas />} />
            <Route path="/comisionista/vehiculos" element={<Vehiculos />} />
            <Route path="/comisionista/envios/:id" element={<TrackingEnvioComisionista />} />
            <Route path="/comisionista/envios/:id/tracking" element={<TrackingEnvioComisionista />} />
            <Route path="/comisionista/notificaciones" element={<NotificacionesComisionista />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <TestDatePanel />
    </>
  );
}