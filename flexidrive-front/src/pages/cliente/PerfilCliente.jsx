//flexidrive-front\src\pages\cliente\PerfilCliente.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button } from "../../components/UI";
import Loader from "../../components/Loader";
import { getProfile } from "../../services/profileMock";

export default function PerfilCliente() {
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getProfile();
      setP(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader />;
  if (!p) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">Perfil</h1>

      <Card title="Datos personales">
        <Row label="Nombre" value={`${p.nombre} ${p.apellido}`} />
        <Row label="Email" value={p.email} />
        <Row label="Teléfono" value={p.telefono} />
        <Row label="Ciudad" value={`${p.ciudad}, ${p.provincia}`} />

        <div className="mt-6 flex justify-end">
          <Link to="/cliente/perfil/editar">
            <Button>Editar perfil</Button>
          </Link>
        </div>
      </Card>

      <Card title="Direcciones frecuentes">
        <p className="text-slate-600">Administrá tus direcciones guardadas para pedir envíos más rápido.</p>
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
    <div className="flex items-start justify-between gap-6 border-b pb-3 last:border-b-0 last:pb-0">
      <div className="text-slate-500">{label}:</div>
      <div className="text-right font-semibold text-slate-700">{value}</div>
    </div>
  );
}
