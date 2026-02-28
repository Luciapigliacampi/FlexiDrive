// flexidrive-front/src/pages/public/CompleteProfile.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import heroImg from "../../assets/hero.svg";
import { updateProfile } from "../../services/authService";

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

export default function CompleteProfile() {
  const navigate = useNavigate();

  const [dni, setDni] = useState("");
  const [fecha, setFecha] = useState(""); // yyyy-mm-dd
  const [rol, setRol] = useState("cliente");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tempToken = localStorage.getItem("tempToken");

  // ✅ No navegar durante el render
  useEffect(() => {
    if (!tempToken) {
      navigate("/auth/login", { replace: true });
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        dni: Number(onlyDigits(dni)),
        fecha_nacimiento: fecha,
        rol, // "cliente" | "comisionista"
      };

      const data = await updateProfile(payload);

      // ✅ IMPORTANTÍSIMO: si el backend renueva tempToken, guardalo
      if (data?.tempToken) {
        localStorage.setItem("tempToken", data.tempToken);
      }

      // ✅ FLUJO A basado en backend (prioridad)
      if (data?.next === "complete-comisionista") {
        navigate("/auth/complete-comisionista");
        return;
      }

      // Si el backend indica totp/setup, volvemos a Login para usar tu modal
      if (data?.next === "totp" || data?.requiresTotp) {
        navigate("/auth/login");
        return;
      }

      if (data?.next === "setup-2fa" || data?.requiresSetup) {
        // si todavía no tenés pantalla de setup 2FA, mandalo a login
        navigate("/auth/login");
        return;
      }

      // Caso raro: token final directo
      if (data?.token && !data?.requiresTotp && !data?.requiresSetup) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("rol", data.rol || rol);
        navigate((data.rol || rol) === "cliente" ? "/cliente/dashboard" : "/comisionista/dashboard");
        return;
      }

      setError("Respuesta inesperada al completar perfil.");
    } catch (err) {
      setError(err?.message || "No se pudo completar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  // Si no hay tempToken, el useEffect ya redirige
  if (!tempToken) return null;

  return (
    <main className="bg-slate-50">
      <section className="bg-slate-100">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-12 items-center">
            <div className="lg:col-span-1" />

            <div className="lg:col-span-5">
              <h1 className="font-organetto text-xl sm:text-2xl font-extrabold tracking-tight text-blue-700 leading-10">
                COMPLETÁ TU PERFIL
              </h1>
              <p className="mt-5 text-slate-700 max-w-md font-medium">
                Necesitamos algunos datos para activar tu cuenta y que puedas usar FlexiDrive.
              </p>

              <div className="mt-8 flex justify-center lg:justify-start">
                <img
                  src={heroImg}
                  alt="FlexiDrive"
                  className="w-full max-w-[520px] object-contain"
                />
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-7">
                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <label className="block text-base text-slate-700 mb-2">DNI</label>
                  <input
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    placeholder="Ej: 40123456"
                    required
                  />

                  <label className="block text-base text-slate-700 mt-6 mb-2">
                    Fecha de nacimiento
                  </label>
                  <input
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    type="date"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                    required
                  />

                  <label className="block text-base text-slate-700 mt-6 mb-2">Rol</label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="comisionista">Comisionista</option>
                  </select>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-blue-700 text-white py-3.5 font-medium shadow-sm hover:bg-blue-800 transition disabled:opacity-60"
                  >
                    {loading ? "Guardando..." : "Continuar"}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-1" />
          </div>
        </div>
      </section>
    </main>
  );
}