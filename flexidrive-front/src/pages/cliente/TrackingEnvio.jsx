//flexidrive-front\src\pages\cliente\TrackingEnvio.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/Loader";
import TrackingProgress from "../../components/TrackingProgress";
import StatusBadge from "../../components/StatusBadge";
import { Card, Button } from "../../components/UI";
import { getEnvioById } from "../../services/shipmentServices";

export default function TrackingEnvio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [envio, setEnvio] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getEnvioById(id);
        setEnvio(data);
      } catch (e) {
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Loader label="Cargando seguimiento..." />;
  if (error) return <div className="rounded-xl border bg-white p-6 text-red-600">{error}</div>;
  if (!envio) return null;

  const isEntregado = envio.estado === "entregado";
  const isCancelado = envio.estado === "cancelado";
  const isDemorado = envio.estado === "demorado";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-5xl font-bold tracking-tight text-slate-700">Envío #{envio.id}</h1>
        <StatusBadge estado={envio.estado} />
      </div>

      {isCancelado ? (
        <Alert type="danger" title="Envío cancelado" desc="Este envío fue cancelado. Si necesitás ayuda, contactá soporte." />
      ) : isDemorado ? (
        <Alert type="warn" title="Envío demorado" desc="Detectamos una demora. Te avisamos cuando se normalice el recorrido." />
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card title="Detalles del Envío">
            <Row label="Origen" value={envio.origenDireccion} />
            <Row label="Destino" value={envio.destinoDireccion} />
            <Row label="Fecha de retiro" value={envio.fechaRetiro} />
            <Row label="Fecha de entrega" value={envio.fechaEntrega} />
            <Row label="Pago" value={prettyPago(envio.metodoPago)} />
            <Row label="Precio" value={envio.precio ? `$${envio.precio}` : "—"} />
          </Card>

          <Card title="Comisionista">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-200" />
              <div>
                <div className="text-xl font-bold text-slate-700">{envio.comisionista}</div>
                <div className="text-slate-500">⭐ {envio.ratingComisionista}</div>
              </div>
            </div>

            {!isCancelado ? (
              <div className="mt-5 flex gap-3">
                <button className="w-full rounded-full border px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                  Enviar Mensaje
                </button>
                <button className="w-full rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">
                  Llamar
                </button>
              </div>
            ) : null}
          </Card>

          <Card title="Información adicional">
            <Row label="Horario retiro aprox." value={envio.horarioRetiroAprox} />
            <Row label="Notas" value={envio.notas || "—"} />
          </Card>

          {isEntregado ? (
            <Card title="¿Cómo fue la experiencia?">
              <p className="text-slate-600">Calificá al comisionista para ayudar a la comunidad.</p>
              <Button onClick={() => navigate(`/cliente/envios/${envio.id}/calificar`)} className="w-full mt-4">
                Calificar comisionista
              </Button>
            </Card>
          ) : null}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border bg-white p-4">
            <div className="h-[380px] w-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
              Mapa
            </div>
          </div>

          <TrackingProgress progreso={envio.progreso} />

          <div className="flex justify-end">
            <Link to="/cliente/envios" className="font-semibold text-blue-700 hover:underline">
              Volver a historial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Alert({ type, title, desc }) {
  const cls =
    type === "danger"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-orange-200 bg-orange-50 text-orange-900";
  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <div className="font-bold">{title}</div>
      <div className="mt-1">{desc}</div>
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

function prettyPago(p) {
  const map = { efectivo: "Efectivo", transferencia: "Transferencia", mercadopago: "Mercado Pago" };
  return map[p] || "—";
}
