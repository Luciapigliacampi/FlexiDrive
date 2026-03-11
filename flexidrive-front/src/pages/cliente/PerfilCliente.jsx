import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button } from "../../components/UI";
import Loader from "../../components/Loader";
import { getMyProfile } from "../../services/profileService";

function formatFecha(fecha) {
  if (!fecha) return "—";

  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("es-AR");
}

function safeValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function PerfilCliente() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [p, setP] = useState(null);

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyProfile();

        if (!alive) return;

        setP(data);
      } catch (err) {
        if (!alive) return;

        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "No se pudieron cargar los datos del cliente."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold text-slate-700">Perfil</h1>

        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold text-slate-700">Perfil</h1>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          No se encontraron datos del perfil.
        </div>
      </div>
    );
  }

  const nombreCompleto = `${p?.nombre || ""} ${p?.apellido || ""}`.trim();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">Perfil</h1>

      <Card title="Datos personales">
        <div className="space-y-4">
          <Row label="Nombre" value={safeValue(nombreCompleto)} />
          <Row label="Email" value={safeValue(p?.email)} />
          <Row label="Teléfono" value={safeValue(p?.telefono)} />
          <Row label="DNI" value={safeValue(p?.dni)} />
          <Row label="Fecha de nacimiento" value={formatFecha(p?.fecha_nacimiento)} />
          <Row label="Rol" value={safeValue(p?.rol || "cliente")} />
          <Row label="Estado" value={safeValue(p?.estado)} />
        </div>

        <div className="mt-6 flex justify-end">
          <Link to="/cliente/perfil/editar">
            <Button>Editar perfil</Button>
          </Link>
        </div>
      </Card>

      <Card title="Direcciones frecuentes">
        <p className="text-slate-600">
          Administrá tus direcciones guardadas para pedir envíos más rápido.
        </p>

        <div className="mt-4">
          <Link to="/cliente/direcciones">
            <Button variant="outline">Ir a direcciones</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
      <div className="text-slate-500">{label}:</div>
      <div className="text-right font-semibold text-slate-700">{value}</div>
    </div>
  );
}