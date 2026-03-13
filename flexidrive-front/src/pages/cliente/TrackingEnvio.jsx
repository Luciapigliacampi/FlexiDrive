// flexidrive-front/src/pages/comisionista/TrackingEnvio.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Package, Clock, CheckCircle2,
  PackageCheck, AlertCircle, XCircle, Banknote, CreditCard, CheckCheck,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import { toEstadoKey, estadoLabel } from "../../utils/estadoUtils";
import {
  getEnvioById,
  marcarRetirado,
  marcarEntregado,
  aceptarEnvio,
  cancelarPorComisionista,
  confirmarPago,
} from "../../services/shipmentServices";
import { formatFechaEntrega } from "../../utils/fechas";
import { useConfirm } from "../../components/ConfirmDialog";
import api from "../../services/api";

const PASOS = [
  { estado: "PENDIENTE",  label: "Pendiente" },
  { estado: "ASIGNADO",   label: "Aceptado"  },
  { estado: "RETIRADO",   label: "Retirado"  },
  { estado: "EN_RETIRO",  label: "En retiro" },
  { estado: "EN_CAMINO",  label: "En camino" },
  { estado: "ENTREGADO",  label: "Entregado" },
];

const ORDEN_ESTADOS = PASOS.map((p) => p.estado);

function pasoActual(estadoId) {
  if (estadoId === "CANCELADO") return -1;
  if (estadoId === "DEMORADO_RETIRO")  return ORDEN_ESTADOS.indexOf("EN_RETIRO");
  if (estadoId === "DEMORADO_ENTREGA") return ORDEN_ESTADOS.indexOf("EN_CAMINO");
  const idx = ORDEN_ESTADOS.indexOf(estadoId);
  return idx >= 0 ? idx : -1;
}

const METODO_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia" };
const METODO_ICON  = { efectivo: Banknote, transferencia: CreditCard };

export default function TrackingEnvioComisionista() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const confirm   = useConfirm();

  const [envio, setEnvio]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [acting, setActing]         = useState(null);
  const [calificacion, setCalificacion] = useState(null);

  // Estado local del pago para optimistic update
  const [pago, setPago] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getEnvioById(id);
      setEnvio(data);
      setPago(data.pago ?? null);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo cargar el envío.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  useEffect(() => {
    if (!envio || envio.estadoId !== "ENTREGADO") return;
    const CAL_BASE = import.meta.env.VITE_CALIFICACIONES_API_URL || "http://localhost:3003";
    api.get(`${CAL_BASE}/api/calificaciones/envio/${id}`)
      .then((r) => setCalificacion(r.data ?? null))
      .catch(() => {});
  }, [envio, id]);

  async function accion(fn, key) {
    setActing(key);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Error al actualizar.");
    } finally {
      setActing(null);
    }
  }

  function handlePago(metodo) {
    const MetodoIcon = METODO_ICON[metodo];
    confirm(`¿Confirmar pago por ${METODO_LABEL[metodo]}?`, {
      labelConfirm: "Confirmar pago",
      onConfirm: async () => {
        // Optimistic
        setPago({ confirmado: true, metodo, fecha: new Date().toISOString() });
        try {
          await confirmarPago(id, metodo);
        } catch (e) {
          // Revertir
          setPago(envio?.pago ?? null);
          setError(e?.response?.data?.message || "No se pudo confirmar el pago.");
        }
      },
    });
  }

  const estadoId       = envio?.estadoId || "";
  const envioCancelado = estadoId === "CANCELADO";
  const puedeAceptar   = estadoId === "PENDIENTE";
  const puedeCancelar  = ["PENDIENTE","ASIGNADO","EN_RETIRO","EN_CAMINO","DEMORADO_RETIRO","DEMORADO_ENTREGA"].includes(estadoId);
  const puedeRetirar   = ["ASIGNADO","EN_RETIRO","DEMORADO_RETIRO"].includes(estadoId);
  const puedeEntregar  = ["RETIRADO","EN_CAMINO","DEMORADO_ENTREGA"].includes(estadoId);
  const paso           = pasoActual(estadoId);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Cargando envío...</div>;
  }

  if (error && !envio) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-red-700">
        <AlertCircle className="mx-auto mb-2 h-8 w-8" />
        {error}
      </div>
    );
  }

  return (
    <div className="m-6 space-y-6 max-w-2xl">
      <button type="button" onClick={() => navigate("/comisionista/envios")}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Envío #{envio.nro_envio}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Creado el {new Date(envio.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>
        <StatusBadge estado={toEstadoKey(envio.estadoId)} label={estadoLabel(envio.estadoId)} />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Progreso */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">Progreso del envío</h2>
        {envioCancelado && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            Este envío fue cancelado.
          </div>
        )}
        <div className="flex items-center gap-0">
          {PASOS.map((p, i) => {
            const done            = !envioCancelado && paso >= 0 && i < paso;
            const current         = !envioCancelado && paso >= 0 && i === paso;
            const currentDemorado = current && estadoId === "DEMORADO";
            const last            = i === PASOS.length - 1;
            return (
              <div key={p.estado} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={[
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                    done            ? "bg-emerald-600 border-emerald-600 text-white" : "",
                    currentDemorado ? "bg-orange-500 border-orange-500 text-white"  : "",
                    current && !currentDemorado ? "bg-blue-700 border-blue-700 text-white" : "",
                    !done && !current ? "bg-white border-slate-300 text-slate-400" : "",
                  ].join(" ")}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 text-center leading-tight ${
                    currentDemorado ? "font-bold text-orange-500"
                    : current       ? "font-bold text-blue-700"
                    : done          ? "text-emerald-600"
                    : "text-slate-400"}`}>
                    {p.label}
                  </span>
                </div>
                {!last && (
                  <div className={`h-0.5 flex-1 mx-1 mb-4 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalles */}
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
          {envio.fecha_entrega ? formatFechaEntrega(envio.fecha_entrega) : "—"}
        </InfoRow>
        {envio.franja_horaria_retiro && (
          <InfoRow icon={<Clock className="h-4 w-4 text-slate-500" />} label="Franja de retiro">
            {envio.franja_horaria_retiro}
          </InfoRow>
        )}
        {envio.metodo_pago_cliente && (
          <InfoRow icon={<CreditCard className="h-4 w-4 text-slate-500" />} label="Medio de pago acordado">
            {{ efectivoOrigen: "Efectivo en origen", efectivoDestino: "Efectivo en destino", transferencia: "Transferencia" }[envio.metodo_pago_cliente] ?? envio.metodo_pago_cliente}
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
        {/* Estado del pago inline */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {pago?.confirmado
              ? <CheckCheck className="h-4 w-4 text-emerald-600" />
              : <Banknote className="h-4 w-4 text-slate-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Estado del pago</div>
            {pago?.confirmado ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-emerald-600 font-semibold">
                  Pagado · {METODO_LABEL[pago.metodo] ?? pago.metodo}
                </span>
                <button
                  type="button"
                  onClick={() => confirm("¿Marcar el pago como pendiente?", {
                    labelConfirm: "Sí, revertir",
                    onConfirm: async () => {
                      setPago(null);
                      try { await confirmarPago(id, null); }
                      catch { setPago(pago); }
                    },
                  })}
                  className="text-xs text-slate-400 hover:text-red-500 underline transition"
                >
                  Revertir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-400">Pendiente de cobro</span>
                <button
                  type="button"
                  onClick={() => handlePago("efectivo")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
                >
                  <Banknote className="h-3 w-3" /> Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => handlePago("transferencia")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-semibold text-slate-600 hover:text-blue-700 transition"
                >
                  <CreditCard className="h-3 w-3" /> Transferencia
                </button>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Acciones de estado */}
      {(puedeAceptar || puedeCancelar || puedeRetirar || puedeEntregar) && (
        <div className="flex flex-wrap gap-3">
          {puedeAceptar && (
            <button type="button"
              onClick={() => accion(() => aceptarEnvio({ envioId: id }), "aceptar")}
              disabled={acting === "aceptar"}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {acting === "aceptar" ? "Actualizando..." : "Aceptar envío"}
            </button>
          )}
          {puedeCancelar && (
            <button type="button"
              onClick={() => confirm("¿Cancelar este envío?", {
                labelConfirm: "Cancelar envío",
                onConfirm: () => accion(() => cancelarPorComisionista(id), "cancelar"),
              })}
              disabled={acting === "cancelar"}
              className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">
              <XCircle className="h-4 w-4" />
              {acting === "cancelar" ? "Actualizando..." : "Cancelar envío"}
            </button>
          )}
          {puedeRetirar && (
            <button type="button"
              onClick={() => confirm("¿Confirmar retiro de este paquete?", {
                labelConfirm: "Retirar",
                onConfirm: () => accion(() => marcarRetirado(id), "retirar"),
              })}
              disabled={acting === "retirar"}
              className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">
              <PackageCheck className="h-4 w-4" />
              {acting === "retirar" ? "Actualizando..." : "Marcar como retirado"}
            </button>
          )}
          {puedeEntregar && (
            <button type="button"
              onClick={() => confirm("¿Confirmar entrega de este paquete?", {
                labelConfirm: "Entregar",
                onConfirm: () => accion(() => marcarEntregado(id), "entregar"),
              })}
              disabled={acting === "entregar"}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />
              {acting === "entregar" ? "Actualizando..." : "Marcar como entregado"}
            </button>
          )}
        </div>
      )}

      {/* Calificación */}
      {envio?.estadoId === "ENTREGADO" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">Calificación del cliente</h2>
          {calificacion ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map((n) => (
                  <span key={n} className={`text-xl ${n <= calificacion.puntuacion ? "text-yellow-500" : "text-slate-200"}`}>★</span>
                ))}
                <span className="ml-1 font-bold text-slate-700">{calificacion.puntuacion}/5</span>
              </div>
              {calificacion.comentario && (
                <p className="text-sm text-slate-600 italic">"{calificacion.comentario}"</p>
              )}
              <p className="text-xs text-slate-400">{new Date(calificacion.fecha).toLocaleDateString("es-AR")}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">El cliente aún no calificó este envío.</p>
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
