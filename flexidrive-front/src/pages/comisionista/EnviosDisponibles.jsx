// flexidrive-front/src/pages/comisionista/EnviosDisponibles.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Archive, Trash2, X, Eye, AlertCircle } from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { toEstadoKey, estadoLabel } from "../../utils/estadoUtils";

import { getMyShipments } from "../../services/shipmentServices";

import {
  useEnvioAcciones,
  puedeCancel,
  puedeEliminar,
  mensajeBloqueo,
} from "../../hooks/useShipments";
import { getTodayString } from "../../utils/testDate";
import { formatFechaEntrega } from "../../utils/fechas";

registerLocale("es", es);

const ESTADOS = [
  { value: "todos", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "ASIGNADO", label: "Asignado" },
  { value: "EN_RETIRO", label: "En retiro" },
  { value: "EN_CAMINO", label: "En camino" },
  { value: "DEMORADO_RETIRO",  label: "Demorado (retiro)" },
  { value: "DEMORADO_ENTREGA", label: "Demorado (entrega)" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "CANCELADO_RETORNO", label: "Cancelado en tránsito" },
  { value: "DEVUELTO", label: "Devuelto" },
  { value: "archivado", label: "Archivados" },
];

function puedeArchivarComisionista(estadoRaw) {
  const e = String(estadoRaw || "").toUpperCase();
  return ["CANCELADO", "CANCELADO_RETORNO", "ENTREGADO", "DEVUELTO"].includes(e);
}

function puedeAceptar(estadoRaw) {
  return String(estadoRaw || "").toUpperCase() === "PENDIENTE";
}

/* ─── helpers fecha ─── */
function toISODate(d) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function EnviosDisponibles() {
  const navigate = useNavigate();

  const [fechaHoySimulada, setFechaHoySimulada] = useState(() => getTodayString());

  // Reaccionar al panel de pruebas
  useEffect(() => {
    function onTestDateChanged(e) {
  const nuevaFecha = e?.detail?.TEST_DATE;
  if (nuevaFecha) setFechaHoySimulada(nuevaFecha);
  else setFechaHoySimulada(getTodayString()); // ← fallback
}
    window.addEventListener("test-date-changed", onTestDateChanged);
    return () => window.removeEventListener("test-date-changed", onTestDateChanged);
  }, []);

  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [q, setQ] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const mostrarArchivados = estadoFiltro === "archivado";

  async function load() {
    setLoading(true);
    try {
      const res = await getMyShipments({
        archivado: mostrarArchivados ? "true" : undefined,
      });

      const raw = res?.data ?? res;
      const arr =
        Array.isArray(raw?.historial) ? raw.historial :
          Array.isArray(raw) ? raw : [];

      setRows(arr);
    } finally {
      setLoading(false);
    }
  }

  const {
    actionLoading,
    actionError,
    setActionError,
    waLink,
    setWaLink,

    vehiculos,
    vehiculoId,
    setVehiculoId,
    fechaRetiro,
    setFechaRetiro,
    franjaRetiro, setFranjaRetiro,
    openAceptar,
    abrirAceptar,
    cerrarAceptar,
    confirmarAceptar,

    handleRechazarOCancelarComisionista,
    handleArchivar,
    handleEliminar,
  } = useEnvioAcciones({ onSuccess: load, modo: "comisionista" });

  useEffect(() => { load(); }, [estadoFiltro]); // eslint-disable-line

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (mostrarArchivados) {
        if (!s.archivado) return false;
      } else {
        if (estadoFiltro !== "todos") {
          if ((s.estadoId || "").toUpperCase() !== estadoFiltro) return false;
        }
      }

      if (q.trim()) {
        const text = q.toLowerCase();
        const haystack = [
          s.destinoCiudad?.localidadNombre,
          s.origenCiudad?.localidadNombre,
          s.nro_envio,
          s.nombreDestinatario,
          s.direccion_destino?.texto,
        ].join(" ").toLowerCase();
        if (!haystack.includes(text)) return false;
      }

      if (fechaDesde && s.fecha_entrega) {
        if (new Date(s.fecha_entrega) < new Date(fechaDesde)) return false;
      }
      if (fechaHasta && s.fecha_entrega) {
        if (new Date(s.fecha_entrega) > new Date(fechaHasta + "T23:59:59")) return false;
      }

      return true;
    });
  }, [rows, estadoFiltro, q, fechaDesde, fechaHasta, mostrarArchivados]);

  return (
    <div className="space-y-4 m-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-700">Envíos asignados</h1>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {waLink && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          <span>Envío cancelado. Coordiná la devolución:</span>
          <a href={waLink} target="_blank" rel="noreferrer" className="font-semibold underline hover:text-green-900">
            Contactar por WhatsApp
          </a>
          <button onClick={() => setWaLink(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="rounded-md border-slate-300 border bg-white px-4 py-2 text-slate-700 outline-none"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 rounded-md border-slate-300 border bg-white px-4 py-2">
          <span className="text-sm text-slate-500">Desde</span>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="outline-none text-slate-700 text-sm" />
        </div>

        <div className="flex items-center gap-2 rounded-md border-slate-300 border bg-white px-4 py-2">
          <span className="text-sm text-slate-500">Hasta</span>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="outline-none text-slate-700 text-sm" />
        </div>

        <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-md border-slate-300 border bg-white px-4 py-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por ciudad, nro. envío o destinatario"
            className="w-full outline-none text-slate-700 text-sm"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {(estadoFiltro !== "todos" || fechaDesde || fechaHasta || q) && (
          <button
            type="button"
            onClick={() => { setEstadoFiltro("todos"); setFechaDesde(""); setFechaHasta(""); setQ(""); }}
            className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <EmptyState title="No hay envíos para mostrar" subtitle="Probá cambiando el filtro o la búsqueda." />
      ) : (
        <div className="overflow-x-auto rounded-md border-slate-300 border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="font-semibold divide-y-1 px-2 divide-slate-300">
                <th className="px-2 py-4">Nro. envío</th>
                <th className="px-2 py-4">Cliente</th>
                <th className="px-2 py-4">Origen</th>
                <th className="px-2 py-4">Destinatario</th>
                <th className="px-2 py-4">Destino</th>
                <th className="px-2 py-4">Fecha entrega</th>
                <th className="px-2 py-4">Estado</th>
                <th className="px-2 py-4 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((s) => {
                const envioId = s._id || s.id;
                const estadoRaw = s.estadoId || "PENDIENTE";
                const estadoKey = toEstadoKey(estadoRaw);
                const destino = s.destinoCiudad?.localidadNombre || "—";
                const fechaEntrega = formatFechaEntrega(s.fecha_entrega);
                const isActioning = (k) => actionLoading === envioId + "_" + k;

                return (
                  <tr key={envioId} className="hover:bg-slate-50 transition-colors border border-slate-300 divide-y-1 divide-slate-300">
                    <td className="px-2 py-4">
                      <Link to={`/comisionista/envios/${envioId}`} className="font-bold text-blue-700 hover:underline">
                        #{s.nro_envio || envioId}
                      </Link>
                    </td>
                    <td className="px-2 py-4 text-slate-700">{s.nombreCliente || "—"}</td>
                    <td className="px-2 py-4 text-slate-700">{s.origenCiudad?.localidadNombre || "—"}</td>
                    <td className="px-2 py-4 text-slate-700">{s.nombreDestinatario || s.direccion_destino?.texto?.split(",")[0] || "—"}</td>
                    <td className="px-2 py-4 text-slate-700">{destino}</td>
                    <td className="px-5 py-4 text-slate-700">{fechaEntrega}</td>
                    <td className="px-2 py-4">
                      <StatusBadge estado={estadoKey} label={estadoLabel(estadoRaw)} />
                    </td>
                    <td className="px-2 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn icon={<Eye className="w-4 h-4" />} title="Ver detalle" onClick={() => navigate(`/comisionista/envios/${envioId}`)} color="blue" />
                        <ActionBtn
                          icon={<Check className="w-4 h-4" />}
                          title={puedeAceptar(estadoRaw) ? "Aceptar envío" : "Solo disponible en PENDIENTE"}
                          onClick={() => abrirAceptar(envioId, estadoRaw)}
                          disabled={!puedeAceptar(estadoRaw) || isActioning("aceptar")}
                          blocked={!puedeAceptar(estadoRaw)}
                          color="emerald"
                        />
                        <ActionBtn
                          icon={<X className="w-4 h-4" />}
                          title={puedeCancel(estadoRaw) ? ((estadoRaw || "").toUpperCase() === "PENDIENTE" ? "Rechazar envío" : "Cancelar envío") : mensajeBloqueo("cancelar", estadoRaw)}
                          onClick={() => handleRechazarOCancelarComisionista(envioId, estadoRaw)}
                          disabled={!puedeCancel(estadoRaw) || isActioning("cancelar")}
                          blocked={!puedeCancel(estadoRaw)}
                          color="red"
                        />
                        <ActionBtn
                          icon={<Archive className="w-4 h-4" />}
                          title={puedeArchivarComisionista(estadoRaw) ? "Archivar envío" : "Solo disponible si está finalizado"}
                          onClick={() => handleArchivar(envioId, estadoRaw)}
                          disabled={!puedeArchivarComisionista(estadoRaw) || isActioning("archivar")}
                          blocked={!puedeArchivarComisionista(estadoRaw)}
                          color="amber"
                        />
                        <ActionBtn
                          icon={<Trash2 className="w-4 h-4" />}
                          title={puedeEliminar(estadoRaw) ? "Eliminar del historial" : mensajeBloqueo("eliminar", estadoRaw)}
                          onClick={() => handleEliminar(envioId, estadoRaw)}
                          disabled={!puedeEliminar(estadoRaw) || isActioning("eliminar")}
                          blocked={!puedeEliminar(estadoRaw)}
                          color="red"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <AceptarEnvioModal
            open={openAceptar}
            onClose={cerrarAceptar}
            vehiculos={vehiculos}
            vehiculoId={vehiculoId}
            setVehiculoId={setVehiculoId}
            fechaRetiro={fechaRetiro}
            setFechaRetiro={setFechaRetiro}
            franjaRetiro={franjaRetiro}
            setFranjaRetiro={setFranjaRetiro}
            error={actionError}
            onConfirm={confirmarAceptar}
            loading={String(actionLoading || "").includes("_aceptar")}
            fechaHoySimulada={fechaHoySimulada}
          />
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, title, onClick, disabled, blocked, color }) {
  const colors = {
    blue: "hover:bg-blue-50 hover:text-blue-700",
    red: "hover:bg-red-50 hover:text-red-600",
    amber: "hover:bg-amber-50 hover:text-amber-600",
    emerald: "hover:bg-emerald-50 hover:text-emerald-700",
  };
  return (
    <button
      type="button" title={title}
      onClick={blocked ? undefined : onClick}
      disabled={disabled}
      className={["rounded-lg p-2 text-slate-400 transition-colors", blocked ? "cursor-not-allowed opacity-30" : `cursor-pointer text-slate-500 ${colors[color] || ""}`, disabled && !blocked ? "opacity-40" : ""].join(" ")}
    >
      {icon}
    </button>
  );
}

const FRANJAS = [
  { value: "08:00-13:00", label: "Mañana (8 a 13 hs)" },
  { value: "13:00-17:00", label: "Tarde (13 a 17 hs)" },
  { value: "17:00-20:00", label: "Noche (17 a 20 hs)" },
];

function AceptarEnvioModal({
  open, onClose,
  vehiculos, vehiculoId, setVehiculoId,
  fechaRetiro, setFechaRetiro,
  franjaRetiro, setFranjaRetiro,
  onConfirm, loading, error,
  fechaHoySimulada,
}) {
  if (!open) return null;
  const list = Array.isArray(vehiculos) ? vehiculos : [];

  // Fecha mínima: hoy simulado (viene como prop para ser reactiva al panel de pruebas)
  const minDate = fromISODate(fechaHoySimulada || getTodayString());

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">

          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-800">Aceptar envío</h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-slate-600">
              Seleccioná el vehículo, la fecha y la franja en que vas a retirar el paquete.
            </p>

            {list.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
                No tenés vehículos cargados. Creá uno en <b>Vehículos</b> para poder aceptar envíos.
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">Vehículo</label>
                <select
                  value={vehiculoId || ""}
                  onChange={(e) => setVehiculoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                >
                  <option value="" disabled>Elegí un vehículo...</option>
                  {list.map((v) => {
                    const id = v._id || v.id;
                    const label = (`${v.marca || ""} ${v.modelo || ""}`.trim() + (v.patente ? ` • ${v.patente}` : "")) || `Vehículo ${id}`;
                    return <option key={id} value={id}>{label}</option>;
                  })}
                </select>
              </div>
            )}

            {/* ✅ FIX: DatePicker en lugar de input type="date" nativo */}
            {/* El input nativo bloquea fechas pasadas según el sistema real, ignorando el min= simulado */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">
                ¿Cuándo vas a retirar el paquete?
              </label>
              <DatePicker
                selected={fromISODate(fechaRetiro)}
                onChange={(date) => setFechaRetiro(toISODate(date))}
                filterDate={(date) => date >= minDate}
                openToDate={minDate}
                dateFormat="dd/MM/yyyy"
                locale="es"
                calendarStartDay={1}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                placeholderText="Seleccioná una fecha"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">
                ¿En qué franja horaria vas a pasar?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {FRANJAS.map((f) => (
                  <button
                    key={f.value} type="button"
                    onClick={() => setFranjaRetiro(f.value)}
                    className={["rounded-xl border px-2 py-2 text-xs font-semibold text-center transition", franjaRetiro === f.value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"].join(" ")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Esto influye en la optimización de tu ruta del día.
              </p>
            </div>
          </div>

          {error && (
            <div className="mx-5 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" disabled={loading}>
              Cancelar
            </button>
            <button
              type="button" onClick={onConfirm}
              disabled={loading || !vehiculoId || !fechaRetiro || !franjaRetiro || list.length === 0}
              className={["rounded-xl px-4 py-2 text-sm font-extrabold text-white", (loading || !vehiculoId || !fechaRetiro || !franjaRetiro || list.length === 0) ? "bg-slate-300 cursor-not-allowed" : "bg-blue-700 hover:bg-blue-800"].join(" ")}
            >
              {loading ? "Aceptando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
