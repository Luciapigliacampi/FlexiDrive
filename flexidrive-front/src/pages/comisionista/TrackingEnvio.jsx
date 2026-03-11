// flexidrive-front/src/pages/comisionista/TrackingEnvio.jsx
// Ruta: /comisionista/envios/:id/tracking
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Package, Clock, CheckCircle2,
  PackageCheck, AlertCircle, User, Phone,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import { toEstadoKey, estadoLabel } from "../../utils/estadoUtils";
import { getEnvioById } from "../../services/shipmentServices";
import { marcarRetirado, marcarEntregado } from "../../services/shipmentServices";
import { formatFechaEntrega } from "../../utils/fechas";

const PASOS = [
  { estado: "PENDIENTE",         label: "Pendiente" },
  { estado: "ASIGNADO",          label: "Aceptado" },
  { estado: "RETIRADO",          label: "Retirado" },
  { estado: "EN_RETIRO",         label: "En retiro" },
  { estado: "EN_CAMINO",         label: "En camino" },
  { estado: "ENTREGADO",         label: "Entregado" },
];

const ORDEN_ESTADOS = PASOS.map(p => p.estado);

function pasoActual(estadoId) {
  const idx = ORDEN_ESTADOS.indexOf(estadoId);
  return idx >= 0 ? idx : 0;
}

export default function TrackingEnvioComisionista() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [envio,   setEnvio]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [acting,  setActing]  = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res  = await getEnvioById(id);
      const data = res?.data ?? res;
      setEnvio(data);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo cargar el envío.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);  // eslint-disable-line

  async function accion(fn, key) {
    setActing(key);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Error al actualizar.");
    } finally {
      setActing(null);
    }
  }

  const puedeRetirar  = envio && ["ASIGNADO", "EN_RETIRO"].includes(envio.estadoId);
  const puedeEntregar = envio && ["RETIRADO", "EN_CAMINO", "DEMORADO"].includes(envio.estadoId);
  const paso          = envio ? pasoActual(envio.estadoId) : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500">Cargando envío...</div>
  );

  if (error && !envio) return (
    <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-red-700">
      <AlertCircle className="mx-auto mb-2 h-8 w-8" />
      {error}
    </div>
  );

  return (
    <div className="m-6 space-y-6 max-w-2xl">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Envío #{envio.nro_envio}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Creado el {new Date(envio.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>
        <StatusBadge estado={toEstadoKey(envio.estadoId)} label={estadoLabel(envio.estadoId)} />
      </div>

      {/* Error de acción */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stepper de estados */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">
          Progreso del envío
        </h2>
        <div className="flex items-center gap-0">
          {PASOS.map((p, i) => {
            const done    = i < paso;
            const current = i === paso;
            const last    = i === PASOS.length - 1;
            return (
              <div key={p.estado} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={[
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                    done    ? "bg-emerald-600 border-emerald-600 text-white"  : "",
                    current ? "bg-blue-700 border-blue-700 text-white"        : "",
                    !done && !current ? "bg-white border-slate-300 text-slate-400" : "",
                  ].join(" ")}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 text-center leading-tight ${current ? "font-bold text-blue-700" : done ? "text-emerald-600" : "text-slate-400"}`}>
                    {p.label}
                  </span>
                </div>
                {!last && (
                  <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < paso ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info del envío */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Detalles</h2>

        <InfoRow icon={<MapPin className="h-4 w-4 text-blue-600" />} label="Origen">
          {envio.direccion_origen?.texto || envio.origenCiudad?.localidadNombre || "—"}
        </InfoRow>
        <InfoRow icon={<MapPin className="h-4 w-4 text-emerald-600" />} label="Destino">
          {envio.direccion_destino?.texto || envio.destinoCiudad?.localidadNombre || "—"}
        </InfoRow>
        <InfoRow icon={<Package className="h-4 w-4 text-slate-500" />} label="Paquetes">
          {envio.paquetes?.length ?? 0} bulto{envio.paquetes?.length !== 1 ? "s" : ""}
        </InfoRow>
        <InfoRow icon={<Clock className="h-4 w-4 text-slate-500" />} label="Fecha de entrega">
          {envio.fecha_entrega
            ? formatFechaEntrega(envio.fecha_entrega)
            : "—"}
        </InfoRow>
        {envio.franja_horaria_retiro && (
          <InfoRow icon={<Clock className="h-4 w-4 text-slate-500" />} label="Franja de retiro">
            {envio.franja_horaria_retiro}
          </InfoRow>
        )}
        {envio.fecha_retiro && (
          <InfoRow icon={<Clock className="h-4 w-4 text-violet-500" />} label="Fecha de retiro confirmada">
            {new Date(envio.fecha_retiro).toLocaleDateString("es-AR")}
          </InfoRow>
        )}
        {envio.notas_adicionales && (
          <InfoRow icon={<AlertCircle className="h-4 w-4 text-amber-500" />} label="Notas">
            {envio.notas_adicionales}
          </InfoRow>
        )}
      </div>

      {/* Botones de acción */}
      {(puedeRetirar || puedeEntregar) && (
        <div className="flex flex-wrap gap-3">
          {puedeRetirar && (
            <button
              type="button"
              onClick={() => accion(() => marcarRetirado(id), "retirar")}
              disabled={acting === "retirar"}
              className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              <PackageCheck className="h-4 w-4" />
              {acting === "retirar" ? "Actualizando..." : "Marcar como retirado"}
            </button>
          )}
          {puedeEntregar && (
            <button
              type="button"
              onClick={() => accion(() => marcarEntregado(id), "entregar")}
              disabled={acting === "entregar"}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {acting === "entregar" ? "Actualizando..." : "Marcar como entregado"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}
