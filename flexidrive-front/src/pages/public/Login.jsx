// flexidrive-front/src/pages/public/Login.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Clock, Truck, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import heroImg from "../../assets/hero.svg";
import googleIcon from "../../assets/google-icon.svg";
import {
  loginUser,
  verifyTotp,
  loginWithGoogle,
  enableTotp,
  confirmTotp,
} from "../../services/authService";

function getApiErrorMessage(err, fallback = "Ocurrió un error.") {
  const data = err?.response?.data;
  if (Array.isArray(data?.detalles) && data.detalles.length > 0) {
    return data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join("\n");
  }
  return data?.error || data?.message || err?.message || fallback;
}

export default function Login() {
  const location = useLocation();
  const avisoSesion = location.state?.aviso || "";
  const navigate = useNavigate();

  // ✅ Todos los modales arrancan cerrados — el useEffect los abre si corresponde
  const [totpOpen, setTotpOpen] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [setup2FAOpen, setSetup2FAOpen] = useState(false);
  const [setupUserId, setSetupUserId] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal TOTP (verificar código existente)
  const [codigoIngresado, setCodigoIngresado] = useState("");

  // Modal Setup 2FA (escanear QR por primera vez)
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [setupCode, setSetupCode] = useState("");

  const googleBtnRef = useRef(null);

  // ✅ useEffect corregido: lee el state UNA vez, lo sincroniza y limpia la URL
  useEffect(() => {
    const state = location.state;

    if (state?.tempToken) {
      localStorage.setItem("tempToken", state.tempToken);
      setTempToken(state.tempToken);
    }

    if (state?.openSetup2FA === true) {
      setSetup2FAOpen(true);
      if (state?.usuarioId) setSetupUserId(state.usuarioId);
    }

    if (state?.openTotp === true) {
      setTotpOpen(true);
    }

    // ✅ CLAVE: limpiar el state del historial para que al refrescar no vuelva a abrir modales
    window.history.replaceState({}, document.title);
  }, []);

  // ─── handleLoginResponse ─────────────────────────────────────────────────────
  function handleLoginResponse(data) {
    // Caso 1: sesión activa
    if (data?.token && !data?.requiresTotp && !data?.requiresSetup) {
      localStorage.setItem("token", data.token);
      if (data?.rol) localStorage.setItem("rol", data.rol);

      const usuario = data?.usuario || data?.user || null;
      if (usuario) {
        localStorage.setItem("user", JSON.stringify(usuario));
        localStorage.setItem(
          "username",
          usuario?.nombre || usuario?.username || usuario?.email?.split("@")[0] || "Usuario"
        );
      } else {
        localStorage.setItem(
          "username",
          data?.username || data?.email?.split("@")[0] || "Usuario"
        );
      }

      setTotpOpen(false);
      setCodigoIngresado("");

      if (data?.rol === "cliente") navigate("/cliente/dashboard");
      else if (data?.rol === "comisionista") navigate("/comisionista/dashboard");
      else navigate("/app");
      return true;
    }

    // Caso 2: requiere verificar TOTP
    if (data?.requiresTotp) {
      setTempToken(data?.tempToken || "");
      localStorage.setItem("tempToken", data?.tempToken || "");
      setTotpOpen(true);
      return true;
    }

    // Caso 3 y 4: requiresSetup
    if (data?.requiresSetup) {
      const tmp = data?.tempToken || data?.token || "";
      setTempToken(tmp);
      localStorage.setItem("tempToken", tmp);

      // Caso 3: perfil incompleto → completar datos
      if (data?.perfilCompleto === false) {
        navigate("/auth/complete-profile");
        return true;
      }

      // Caso 4: perfil OK pero sin 2FA → abrir modal Setup 2FA
      const userId = data?.usuarioId || data?.usuario?.id || data?.user?.id || "";
      setSetupUserId(userId);
      setSetup2FAOpen(true);
      return true;
    }

    return false;
  }

  // ─── Login con email/password ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      if (!handleLoginResponse(data)) {
        setError("Respuesta inesperada del servidor en login.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Error al iniciar sesión."));
    } finally {
      setLoading(false);
    }
  };

  // ─── Verificación TOTP ───────────────────────────────────────────────────────
  const handleVerifyTotp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await verifyTotp({ tempToken, codigoIngresado });
      if (!handleLoginResponse(data)) {
        setError("Respuesta inesperada del servidor al verificar TOTP.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Código inválido."));
    } finally {
      setLoading(false);
    }
  };

  // ─── Login con Google ────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const data = await loginWithGoogle({ idToken: credentialResponse.credential });
      if (!handleLoginResponse(data)) {
        setError("Respuesta inesperada del servidor con Google Login.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Error al iniciar sesión con Google."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("No se pudo iniciar sesión con Google. Intentá de nuevo.");
  };

  // ─── Setup 2FA: generar QR ───────────────────────────────────────────────────
  const handleGenerateQR = async () => {
    setError("");
    setLoading(true);
    try {
      if (!setupUserId) throw new Error("No se pudo identificar el usuario para generar el QR.");
      const data = await enableTotp({ userId: setupUserId });
      setOtpauthUrl(data?.otpauthUrl || "");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo generar el QR."));
    } finally {
      setLoading(false);
    }
  };

  // ─── Setup 2FA: confirmar código ─────────────────────────────────────────────
  const handleConfirmSetup2FA = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    if (!setupUserId) throw new Error("No se pudo identificar el usuario.");
    const data = await confirmTotp({ userId: setupUserId, codigoIngresado: setupCode });

    if (data?.requiresTotp && data?.tempToken) {
      localStorage.setItem("tempToken", data.tempToken);
      setTempToken(data.tempToken);
      setSetup2FAOpen(false);
      setSetupCode("");
      setOtpauthUrl("");
      // ✅ Limpiar el código y avisar que necesita uno NUEVO
      setCodigoIngresado("");
      setError("");
      setTotpOpen(true);
      return;
    }
    setError("Respuesta inesperada al confirmar 2FA.");
  } catch (err) {
    setError(getApiErrorMessage(err, "Código inválido."));
  } finally {
    setLoading(false);
  }
};


  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="bg-slate-50">
      <section className="bg-slate-100">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-12 items-center">
            <div className="lg:col-span-1" />

            {/* IZQUIERDA */}
            <div className="lg:col-span-4">
              <h1 className="font-organetto text-xl sm:text-2xl font-extrabold tracking-tight text-blue-700 leading-10">
                FLEXIBILIDAD EN <br /> TRANSPORTE
              </h1>
              <p className="mt-5 text-slate-700 max-w-md font-medium">
                Conectamos clientes con comisionistas para envíos rápidos,
                seguros y con seguimiento en tiempo real.
              </p>
            </div>

            {/* CENTRO */}
            <div className="lg:col-span-4 flex justify-center">
              <img src={heroImg} alt="FlexiDrive" className="w-full max-w-[600px] object-contain" />
            </div>

            {/* DERECHA — formulario */}
            <div className="lg:col-span-3">
              <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-7">

                {/* ✅ Solo UN bloque de error */}
                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
                    {error}
                  </div>
                )}

                {avisoSesion && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {avisoSesion}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <label className="block text-base text-slate-700 mb-2">Usuario o email</label>
                  <input
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    type="email" required
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                  />
                  <label className="block text-base text-slate-700 mt-6 mb-2">Contraseña</label>
                  <input
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    type="password" required
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                  />
                  <div className="mt-4 text-right">
                    <Link to="/auth/forgot" className="text-sm text-blue-700 hover:underline">
                      Olvidé mi contraseña
                    </Link>
                  </div>
                  <button
                    type="submit" disabled={loading}
                    className="mt-5 w-full inline-flex items-center justify-center rounded-full bg-blue-700 text-white py-3.5 font-medium shadow-sm hover:bg-blue-800 transition disabled:opacity-60"
                  >
                    {loading ? "Ingresando..." : "Iniciar sesión"}
                  </button>
                </form>

                <div className="relative mt-4">
                  <button
                    type="button" disabled={loading}
                    onClick={() => {
                      const btn = googleBtnRef.current?.querySelector("div[role='button']");
                      btn?.click();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white py-3.5 font-medium text-slate-800 hover:bg-slate-50 transition disabled:opacity-60 shadow-sm"
                  >
                    <img src={googleIcon} alt="Google" className="w-full max-w-[15px] object-contain" />
                    Iniciar sesión con Google
                  </button>
                  <div
                    ref={googleBtnRef}
                    className="absolute inset-0 opacity-0 pointer-events-none overflow-hidden"
                    aria-hidden="true"
                  >
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap={false}
                      type="standard"
                      size="large"
                      width="400"
                    />
                  </div>
                </div>

                <div className="mt-6 text-center text-sm text-slate-700">
                  ¿No tenés cuenta?{" "}
                  <Link to="/auth/register" className="text-blue-700 font-medium hover:underline">
                    Registrate
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* CARDS */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { Icon: Clock, label: "Envíos rápidos" },
              { Icon: Truck, label: "Envíos flexibles" },
              { Icon: Sparkles, label: "Optimización con IA" },
            ].map(({ Icon, label }) => (
              <div key={label} className="bg-slate-100/80 border border-slate-300 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl border border-slate-300 bg-white flex items-center justify-center">
                  <Icon className="w-6 h-6 text-slate-800" />
                </div>
                <div className="text-xl font-semibold text-blue-700">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MODAL SETUP 2FA ─── */}
      {setup2FAOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Activar 2FA</h2>
            <p className="mt-2 text-sm text-slate-600">
              Generá el QR, escanealo con Google Authenticator y confirmá con un código.
            </p>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 whitespace-pre-line">
                {error}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button" disabled={loading} onClick={handleGenerateQR}
                className="w-1/2 rounded-full bg-blue-700 text-white py-3 font-medium hover:bg-blue-800 transition disabled:opacity-60"
              >
                {loading ? "Generando..." : "Generar QR"}
              </button>
              <button
                type="button"
                onClick={() => { setSetup2FAOpen(false); setOtpauthUrl(""); setSetupCode(""); setError(""); }}
                className="w-1/2 rounded-full border border-slate-300 bg-white py-3 font-medium text-slate-800"
              >
                Cancelar
              </button>
            </div>

            {otpauthUrl && (
              <div className="mt-4 flex flex-col items-center gap-3">
                <img
                  alt="QR 2FA"
                  className="w-48 h-48 border rounded-xl"
                  src={`https://quickchart.io/qr?text=${encodeURIComponent(otpauthUrl)}&size=200`}
                />
                <p className="text-xs text-slate-500 text-center">
                  Escanealo con tu app autenticadora.
                </p>
              </div>
            )}

            <form onSubmit={handleConfirmSetup2FA} className="mt-4">
              <label className="block text-sm text-slate-700 mb-2">Código (6 dígitos)</label>
              <input
                value={setupCode} onChange={(e) => setSetupCode(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                inputMode="numeric" maxLength={6} placeholder="123456" required
              />
              <button
                type="submit"
                disabled={loading || !otpauthUrl}
                className="mt-4 w-full rounded-full bg-slate-900 text-white py-3 font-medium hover:bg-slate-950 transition disabled:opacity-60"
              >
                {loading ? "Confirmando..." : "Confirmar 2FA"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL TOTP ─── */}
{totpOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-900">Verificación TOTP</h2>
      <p className="mt-2 text-sm text-slate-600">
        Ingresá el código de 6 dígitos de tu app autenticadora.
      </p>

      {/* ✅ Aviso específico para cuando viene del setup */}
      {!codigoIngresado && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Tu 2FA fue activada. Esperá que tu app genere un <strong>código nuevo</strong> e ingresalo para continuar.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleVerifyTotp} className="mt-4">
        <label className="block text-sm text-slate-700 mb-2">Código</label>
        <input
          value={codigoIngresado} onChange={(e) => setCodigoIngresado(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
          inputMode="numeric" maxLength={6} placeholder="123456" required
          autoComplete="one-time-code"
        />
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => { setTotpOpen(false); setCodigoIngresado(""); setError(""); }}
            className="w-1/2 rounded-full border border-slate-300 bg-white py-3 font-medium text-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={loading}
            className="w-1/2 rounded-full bg-blue-700 text-white py-3 font-medium hover:bg-blue-800 transition disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </main>
  );
}