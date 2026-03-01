// flexidrive-front/src/pages/public/Register.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import heroImg from "../../assets/hero.svg";
import { registerUser, confirmTotp } from "../../services/authService";
import { Eye, EyeOff } from "lucide-react";

function getApiErrorMessage(err, fallback = "Ocurrió un error.") {
  const data = err?.response?.data;
  if (Array.isArray(data?.detalles) && data.detalles.length > 0) {
    return data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join("\n");
  }
  return data?.error || data?.message || err?.message || fallback;
}

export default function Register() {
  const navigate = useNavigate();

  const [nombre, setNombre]               = useState("");
  const [apellido, setApellido]           = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dni, setDni]                     = useState("");
  const [telefono, setTelefono]           = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [rol, setRol]                     = useState("cliente");

  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");

  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // TOTP setup
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [qrDataUrl, setQrDataUrl]   = useState("");
  const [usuarioId, setUsuarioId]   = useState("");

  // FIX: paso de confirmación TOTP
  const [step, setStep]           = useState("form"); // "form" | "qr" | "confirm"
  const [codigoTotp, setCodigoTotp] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const payload = useMemo(() => ({
    nombre:          nombre.trim(),
    apellido:        apellido.trim(),
    email:           email.trim(),
    password,
    dni:             Number(dni),
    telefono:        String(telefono).trim(),
    fecha_nacimiento: fechaNacimiento,
    rol,
  }), [nombre, apellido, email, password, dni, telefono, fechaNacimiento, rol]);

  useEffect(() => {
    if (!otpauthUrl) return;
    QRCode.toDataURL(otpauthUrl)
      .then(setQrDataUrl)
      .catch(() => setError("No se pudo generar el QR."));
  }, [otpauthUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!/^\d+$/.test(String(telefono))) {
      setLoading(false);
      setError("El teléfono debe tener solo números (sin +, espacios ni guiones).");
      return;
    }
    if (password !== confirmPassword) {
      setLoading(false);
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!/^\d+$/.test(String(dni))) {
      setLoading(false);
      setError("El DNI debe tener solo números.");
      return;
    }

    try {
      const data = await registerUser(payload);

      if (data?.otpauthUrl) {
        setOtpauthUrl(data.otpauthUrl);
        setUsuarioId(String(data.usuarioId || ""));
        setStep("qr");
        return;
      }

      setError("Registro ok, pero el servidor no devolvió otpauthUrl para configurar TOTP.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Error al registrarte."));
    } finally {
      setLoading(false);
    }
  };

  // FIX: confirmar el código TOTP antes de ir al login
  const handleConfirmTotp = async (e) => {
    e.preventDefault();
    setError("");

    if (!codigoTotp || codigoTotp.length !== 6) {
      setError("Ingresá el código de 6 dígitos de tu app.");
      return;
    }
    if (!usuarioId) {
      setError("No se encontró el ID de usuario. Volvé a registrarte.");
      return;
    }

    setConfirmLoading(true);
    try {
      await confirmTotp({ userId: usuarioId, codigoIngresado: codigoTotp });
      // TOTP confirmado → ir al login
      navigate("/auth/login");
    } catch (err) {
      setError(getApiErrorMessage(err, "Código TOTP inválido. Revisá tu app."));
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <main className="bg-slate-50">
      <section className="bg-slate-100">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-12 items-start">

            {/* IZQUIERDA */}
            <div className="lg:col-span-5">
              <h1 className="font-organetto text-xl sm:text-2xl font-extrabold tracking-tight text-blue-700 leading-10">
                CREÁ TU CUENTA <br /> EN FLEXIDRIVE
              </h1>
              <p className="mt-5 text-slate-700 max-w-md font-medium">
                {step === "form"    && "Completá tus datos. Al finalizar, vas a escanear un QR para activar tu código TOTP."}
                {step === "qr"     && "Escaneá el código QR con Google Authenticator u otra app compatible."}
                {step === "confirm" && "Ingresá el código de 6 dígitos que muestra tu app para confirmar la activación."}
              </p>
              <div className="mt-8 hidden lg:flex justify-start">
                <img src={heroImg} alt="FlexiDrive" className="w-full max-w-[520px] object-contain" />
              </div>
            </div>

            {/* DERECHA */}
            <div className="lg:col-span-7">
              <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-7">

                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
                    {error}
                  </div>
                )}

                {/* ── PASO 1: Formulario de registro ── */}
                {step === "form" && (
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-700 mb-2">Nombre</label>
                      <input value={nombre} onChange={(e) => setNombre(e.target.value)} required className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-2">Apellido</label>
                      <input value={apellido} onChange={(e) => setApellido(e.target.value)} required className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slate-700 mb-2">Email</label>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slate-700 mb-2">Contraseña</label>
                      <div className="relative">
                        <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-12 outline-none" />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-blue-700">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slate-700 mb-2">Confirmar contraseña</label>
                      <div className="relative">
                        <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showConfirmPassword ? "text" : "password"} required className={`w-full rounded-lg border bg-white px-4 py-3 pr-12 outline-none ${passwordsMatch ? "border-slate-200" : "border-red-300"}`} />
                        <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-blue-700">
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {!passwordsMatch && <p className="mt-1 text-xs text-red-600">Las contraseñas no coinciden.</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-2">DNI</label>
                      <input value={dni} onChange={(e) => setDni(e.target.value)} inputMode="numeric" required className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-2">Teléfono</label>
                      <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="numeric" placeholder="549353..." required className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none" />
                      <p className="mt-1 text-xs text-slate-500">Solo números. Ej: 54 + 9 + 353 + número.</p>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-2">Fecha de nacimiento</label>
                      <input value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} type="date" required className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-700 mb-2">Rol</label>
                      <select value={rol} onChange={(e) => setRol(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none">
                        <option value="cliente">Cliente</option>
                        <option value="comisionista">Comisionista</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <button type="submit" disabled={loading || !passwordsMatch} className="mt-2 w-full inline-flex items-center justify-center rounded-full bg-blue-700 text-white py-3.5 font-medium shadow-sm hover:bg-blue-800 transition disabled:opacity-60">
                        {loading ? "Creando cuenta..." : "Crear cuenta"}
                      </button>
                      <div className="mt-4 text-center text-sm text-slate-700">
                        ¿Ya tenés cuenta?{" "}
                        <Link to="/auth/login" className="text-blue-700 font-medium hover:underline">Iniciá sesión</Link>
                      </div>
                    </div>
                  </form>
                )}

                {/* ── PASO 2: Mostrar QR ── */}
                {step === "qr" && (
                  <div className="rounded-2xl bg-white border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900">Activá tu verificación (TOTP)</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Escaneá este QR con Google Authenticator. Después hacé clic en "Ya lo escaneé" e ingresá el código.
                    </p>
                    <div className="mt-5 flex justify-center">
                      {qrDataUrl
                        ? <img src={qrDataUrl} alt="QR TOTP" className="w-48 h-48" />
                        : <div className="text-sm text-slate-600">Generando QR...</div>
                      }
                    </div>
                    <div className="mt-5 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => { setError(""); setStep("confirm"); }}
                        className="w-full inline-flex items-center justify-center rounded-full bg-blue-700 text-white py-3.5 font-medium hover:bg-blue-800 transition"
                      >
                        Ya lo escaneé → Ingresar código
                      </button>
                      {/* FIX: en lugar de volver al form (el usuario ya existe en la DB),
                          regeneramos el QR volviendo a llamar a registerUser con los mismos
                          datos — el backend detecta el registro incompleto y devuelve un QR nuevo */}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={async () => {
                          setError("");
                          setLoading(true);
                          try {
                            const data = await registerUser(payload);
                            if (data?.otpauthUrl) {
                              setOtpauthUrl(data.otpauthUrl);
                              setUsuarioId(String(data.usuarioId || ""));
                              setQrDataUrl("");     // resetea para que el useEffect regenere
                            }
                          } catch (err) {
                            setError(getApiErrorMessage(err, "No se pudo regenerar el QR."));
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full inline-flex items-center justify-center rounded-full border border-slate-300 bg-white py-3.5 font-medium text-slate-800 disabled:opacity-60"
                      >
                        {loading ? "Regenerando..." : "Regenerar QR"}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── PASO 3: Confirmar código TOTP ── */}
                {step === "confirm" && (
                  <form onSubmit={handleConfirmTotp} className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-slate-900">Confirmá tu código TOTP</h2>
                    <p className="text-sm text-slate-600">
                      Ingresá el código de 6 dígitos que muestra tu app de autenticación para activar la seguridad de tu cuenta.
                    </p>
                    <div>
                      <label className="block text-sm text-slate-700 mb-2">Código TOTP</label>
                      <input
                        value={codigoTotp}
                        onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none text-center text-2xl tracking-widest font-mono"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit"
                        disabled={confirmLoading || codigoTotp.length !== 6}
                        className="w-full inline-flex items-center justify-center rounded-full bg-blue-700 text-white py-3.5 font-medium hover:bg-blue-800 transition disabled:opacity-60"
                      >
                        {confirmLoading ? "Verificando..." : "Confirmar y entrar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setError(""); setStep("qr"); }}
                        className="w-full inline-flex items-center justify-center rounded-full border border-slate-300 bg-white py-3.5 font-medium text-slate-800"
                      >
                        Ver QR de nuevo
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
