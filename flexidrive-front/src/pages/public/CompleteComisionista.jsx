// flexidrive-front/src/pages/public/CompleteComisionista.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { completeComisionistaTemp } from "../../services/authService";

export default function CompleteComisionista() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    entidadBancaria: "",
    nroCuenta: "",
    alias: "",
    tipoCuenta: "",
    cbu: "",
    cuit: "",
    dniFrente: null,
    dniDorso: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tempToken = localStorage.getItem("tempToken");

  // Si entran sin tempToken, redirigir
  useEffect(() => {
    if (!tempToken) {
      navigate("/auth/login", { replace: true });
    }
  }, [tempToken, navigate]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("entidadBancaria", form.entidadBancaria);
      formData.append("nroCuenta", form.nroCuenta);
      formData.append("alias", form.alias);
      formData.append("tipoCuenta", form.tipoCuenta);
      formData.append("cbu", form.cbu);
      formData.append("cuit", form.cuit);

      if (form.dniFrente) formData.append("dniFrente", form.dniFrente);
      if (form.dniDorso) formData.append("dniDorso", form.dniDorso);

      const data = await completeComisionistaTemp(formData);

      // Si backend devuelve tempToken nuevo, guardarlo
      if (data?.tempToken) {
        localStorage.setItem("tempToken", data.tempToken);
      }

      // 🔥 Flujo A: ahora debe validar TOTP
      navigate("/auth/login");

    } catch (err) {
      setError(err?.message || "No se pudo completar el perfil de comisionista.");
    } finally {
      setLoading(false);
    }
  };

  if (!tempToken) return null;

  return (
    <main className="bg-slate-100 min-h-screen flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-xl">
        <h1 className="text-2xl font-bold text-blue-700">
          Completar datos de comisionista
        </h1>
        <p className="text-gray-600 mt-2">
          Ingresá tus datos bancarios y documentación.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          <input
            name="entidadBancaria"
            placeholder="Entidad bancaria"
            className="w-full border rounded-lg p-3"
            onChange={handleChange}
            required
          />

          <input
            name="nroCuenta"
            placeholder="Número de cuenta"
            className="w-full border rounded-lg p-3"
            onChange={handleChange}
            required
          />

          <input
            name="alias"
            placeholder="Alias"
            className="w-full border rounded-lg p-3"
            onChange={handleChange}
            required
          />

          <input
            name="tipoCuenta"
            placeholder="Tipo de cuenta"
            className="w-full border rounded-lg p-3"
            onChange={handleChange}
            required
          />

          <input
            name="cbu"
            placeholder="CBU (22 dígitos)"
            className="w-full border rounded-lg p-3"
            onChange={handleChange}
            required
          />

          <input
            name="cuit"
            placeholder="CUIT (xx-xxxxxxxx-x)"
            className="w-full border rounded-lg p-3"
            onChange={handleChange}
            required
          />

          {/* <div>
            <label className="block text-sm mb-1">DNI Frente</label>
            <input
              type="file"
              name="dniFrente"
              accept="image/*"
              onChange={handleChange}
              required
            />
          </div> */}

          {/* <div>
            <label className="block text-sm mb-1">DNI Dorso</label>
            <input
              type="file"
              name="dniDorso"
              accept="image/*"
              onChange={handleChange}
              required
            />
          </div> */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white py-3 rounded-full font-medium hover:bg-blue-800 transition"
          >
            {loading ? "Guardando..." : "Continuar"}
          </button>
        </form>
      </div>
    </main>
  );
}