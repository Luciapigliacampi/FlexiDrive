import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroImg from "../../assets/hero.svg";
import { registerUser } from "../../services/authService";
import { Eye, EyeOff } from "lucide-react";

function getApiErrorMessage(err, fallback = "Ocurrió un error.") {
  const data = err?.response?.data;

  if (Array.isArray(data?.detalles) && data.detalles.length > 0) {
    return data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join("\n");
  }

  return data?.error || data?.message || err?.message || fallback;
}

function formatDNIInput(value) {
  const clean = String(value || "").replace(/\D/g, "").slice(0, 8);
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function unformatDNI(value) {
  return String(value || "").replace(/\D/g, "");
}

export default function Register() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [rol, setRol] = useState("cliente");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const payload = useMemo(
    () => ({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim(),
      password,
      dni: Number(unformatDNI(dni)),
      telefono: String(telefono).trim(),
      fecha_nacimiento: fechaNacimiento,
      rol,
    }),
    [nombre, apellido, email, password, dni, telefono, fechaNacimiento, rol]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!/^\d+$/.test(String(telefono))) {
      setLoading(false);
      setError("El teléfono debe tener solo números.");
      return;
    }

    if (String(telefono).length !== 10) {
      setLoading(false);
      setError("El teléfono debe tener exactamente 10 dígitos.");
      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!/^\d+$/.test(unformatDNI(dni))) {
      setLoading(false);
      setError("El DNI debe tener solo números.");
      return;
    }

    try {
      const data = await registerUser(payload);

      if (data?.message || data?.usuarioId) {
        setSuccess(
          "Cuenta creada correctamente. Ahora iniciá sesión para configurar tu verificación TOTP."
        );

        setTimeout(() => {
          navigate("/auth/login", {
            replace: true,
            state: {
              registered: true,
              email: payload.email,
              message:
                "Cuenta creada correctamente. Iniciá sesión para configurar tu verificación TOTP.",
            },
          });
        }, 1500);

        return;
      }

      setError("El servidor devolvió una respuesta inesperada al registrarte.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Error al registrarte."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-slate-80">
      <section className="bg-slate-100">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-12 items-start">
            <div className="lg:col-span-5">
              <h1 className="font-organetto text-xl sm:text-2xl font-extrabold tracking-tight text-blue-700 leading-10">
                CREÁ TU CUENTA <br /> EN FLEXIDRIVE
              </h1>

              <p className="mt-5 text-slate-700 max-w-md font-medium">
                Completá tus datos. Después de crear tu cuenta, vas a iniciar sesión
                para configurar tu código TOTP.
              </p>

              <div className="mt-8 hidden lg:flex justify-start">
                <img
                  src={heroImg}
                  alt="FlexiDrive"
                  className="w-full max-w-[520px] object-contain"
                />
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-7">
                {error ? (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 whitespace-pre-line">
                    {success}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">Nombre</label>
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">Apellido</label>
                    <input
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm text-slate-700 mb-2">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm text-slate-700 mb-2">Contraseña</label>
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-24 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm text-slate-700 mb-2">
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className={`w-full rounded-lg border bg-white px-4 py-3 pr-24 outline-none ${
                          passwordsMatch ? "border-slate-200" : "border-red-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition"
                        aria-label={
                          showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                        }
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {!passwordsMatch ? (
                      <p className="mt-1 text-xs text-red-600">Las contraseñas no coinciden.</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">DNI</label>
                    <input
                      value={dni}
                      onChange={(e) => setDni(formatDNIInput(e.target.value))}
                      inputMode="numeric"
                      placeholder="11.111.111"
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">Teléfono</label>
                    <input
                      value={telefono}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 10) {
                          setTelefono(value);
                        }
                      }}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="3531234567"
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                    <p className="mt-1 text-xs text-slate-500">Código de área + número.</p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">
                      Fecha de nacimiento
                    </label>
                    <input
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      type="date"
                      required
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-700 mb-2">Rol</label>
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    >
                      <option value="cliente">Cliente</option>
                      <option value="comisionista">Comisionista</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={loading || !passwordsMatch}
                      className="mt-2 w-full inline-flex items-center justify-center rounded-full bg-blue-700 text-white py-3.5 font-medium shadow-sm hover:bg-blue-800 transition disabled:opacity-60"
                    >
                      {loading ? "Creando cuenta..." : "Crear cuenta"}
                    </button>

                    <div className="mt-4 text-center text-sm text-slate-700">
                      ¿Ya tenés cuenta?{" "}
                      <Link
                        to="/auth/login"
                        className="text-blue-700 font-medium hover:underline"
                      >
                        Iniciá sesión
                      </Link>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}