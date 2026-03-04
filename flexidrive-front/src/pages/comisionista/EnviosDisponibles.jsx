// flexidrive-front/src/pages/comisionista/EnviosDisponibles.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Archive, Trash2, X, Eye, AlertCircle } from "lucide-react";
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

const ESTADOS = [
  { value: "todos", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "ASIGNADO", label: "Asignado" },
  { value: "EN_RETIRO", label: "En retiro" },
  { value: "EN_CAMINO", label: "En camino" },
  { value: "DEMORADO", label: "Demorado" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "CANCELADO_RETORNO", label: "Cancelado en tránsito" },
  { value: "DEVUELTO", label: "Devuelto" },
  { value: "archivado", label: "Archivados" },
];

// ✅ comisionista: archivar solo finalizados (ok)
function puedeArchivarComisionista(estadoRaw) {
  const e = String(estadoRaw || "").toUpperCase();
  return ["CANCELADO", "CANCELADO_RETORNO", "ENTREGADO", "DEVUELTO"].includes(e);
}

// ✅ aceptar solo PENDIENTE
function puedeAceptar(estadoRaw) {
  return String(estadoRaw || "").toUpperCase() === "PENDIENTE";
}

export default function EnviosDisponibles() {
  const navigate = useNavigate();

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

    // modal aceptar
    vehiculos,
    vehiculoId,
    setVehiculoId,
    openAceptar,
    abrirAceptar,
    cerrarAceptar,
    confirmarAceptar,

    // acciones
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

      {/* Error de acción */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp link (si tu hook lo usa) */}
      {waLink && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          <span>Envío cancelado. Coordiná la devolución:</span>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline hover:text-green-900"
          >
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
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="outline-none text-slate-700 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border-slate-300 border bg-white px-4 py-2">
          <span className="text-sm text-slate-500">Hasta</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="outline-none text-slate-700 text-sm"
          />
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
            onClick={() => {
              setEstadoFiltro("todos");
              setFechaDesde("");
              setFechaHasta("");
              setQ("");
            }}
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
console.log("estadoRaw:", estadoRaw, "→ estadoKey:", estadoKey);
                const destino = s.destinoCiudad?.localidadNombre || "—";
                const fechaEntrega = s.fecha_entrega
  ? new Date(s.fecha_entrega + (s.fecha_entrega.includes("T") ? "" : "T12:00:00"))
      .toLocaleDateString("es-AR")
  : "—";

                const isActioning = (k) => actionLoading === envioId + "_" + k;

                return (
                  <tr
                    key={envioId}
                    className="hover:bg-slate-50 transition-colors border border-slate-300 divide-y-1 divide-slate-300"
                  >
                    <td className="px-2 py-4">
                      <Link to={`/comisionista/envios/${envioId}`} className="font-bold text-blue-700 hover:underline">
                        #{s.nro_envio || envioId}
                      </Link>
                    </td>

                    <td className="px-2 py-4 text-slate-700">
                      {s.nombreCliente || "—"}
                    </td>

                    <td className="px-2 py-4 text-slate-700">
                      {s.origenCiudad?.localidadNombre || "—"}
                    </td>

                    <td className="px-2 py-4 text-slate-700">
                      {s.nombreDestinatario || s.direccion_destino?.texto?.split(",")[0] || "—"}
                    </td>

                    <td className="px-2 py-4 text-slate-700">{destino}</td>
                    <td className="px-5 py-4 text-slate-700">{fechaEntrega}</td>

                    <td className="px-2 py-4">
                      <StatusBadge estado={estadoKey} label={estadoLabel(estadoRaw)} />
                    </td>

                    <td className="px-2 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* Ver */}
                        <ActionBtn
                          icon={<Eye className="w-4 h-4" />}
                          title="Ver detalle"
                          onClick={() => navigate(`/comisionista/envios/${envioId}`)}
                          color="blue"
                        />

                        {/* Aceptar (modal) */}
                        <ActionBtn
                          icon={<Check className="w-4 h-4" />}
                          title={puedeAceptar(estadoRaw) ? "Aceptar envío" : "Solo disponible en PENDIENTE"}
                          onClick={() => abrirAceptar(envioId, estadoRaw)}
                          disabled={!puedeAceptar(estadoRaw) || isActioning("aceptar")}
                          blocked={!puedeAceptar(estadoRaw)}
                          color="emerald"
                        />

                        {/* X = Rechazar si PENDIENTE / Cancelar si ya aceptado */}
                        <ActionBtn
                          icon={<X className="w-4 h-4" />}
                          title={
                            puedeCancel(estadoRaw)
                              ? ((estadoRaw || "").toUpperCase() === "PENDIENTE" ? "Rechazar envío" : "Cancelar envío")
                              : mensajeBloqueo("cancelar", estadoRaw)
                          }
                          onClick={() => handleRechazarOCancelarComisionista(envioId, estadoRaw)}
                          disabled={!puedeCancel(estadoRaw) || isActioning("cancelar")}
                          blocked={!puedeCancel(estadoRaw)}
                          color="red"
                        />

                        {/* Archivar */}
                        <ActionBtn
                          icon={<Archive className="w-4 h-4" />}
                          title={puedeArchivarComisionista(estadoRaw) ? "Archivar envío" : "Solo disponible si está finalizado"}
                          onClick={() => handleArchivar(envioId, estadoRaw)}
                          disabled={!puedeArchivarComisionista(estadoRaw) || isActioning("archivar")}
                          blocked={!puedeArchivarComisionista(estadoRaw)}
                          color="amber"
                        />

                        {/* Eliminar (finalizados: ENTREGADO/CANCELADO/CANCELADO_RETORNO/DEVUELTO) */}
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

          {/* ✅ Modal afuera del map y afuera del tbody */}
          <AceptarEnvioModal
            open={openAceptar}
            onClose={cerrarAceptar}
            vehiculos={vehiculos}
            vehiculoId={vehiculoId}
            setVehiculoId={setVehiculoId}
            onConfirm={confirmarAceptar}
            loading={String(actionLoading || "").includes("_aceptar")}
          />
        </div>
      )}
    </div>
  );
}

// Botón de acción con tooltip nativo y estado bloqueado visual
function ActionBtn({ icon, title, onClick, disabled, blocked, color }) {
  const colors = {
    blue: "hover:bg-blue-50 hover:text-blue-700",
    red: "hover:bg-red-50 hover:text-red-600",
    amber: "hover:bg-amber-50 hover:text-amber-600",
    emerald: "hover:bg-emerald-50 hover:text-emerald-700",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={blocked ? undefined : onClick}
      disabled={disabled}
      className={[
        "rounded-lg p-2 text-slate-400 transition-colors",
        blocked
          ? "cursor-not-allowed opacity-30"
          : `cursor-pointer text-slate-500 ${colors[color] || ""}`,
        disabled && !blocked ? "opacity-40" : "",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}

function AceptarEnvioModal({
  open,
  onClose,
  vehiculos,
  vehiculoId,
  setVehiculoId,
  onConfirm,
  loading,
}) {
  if (!open) return null;

  const list = Array.isArray(vehiculos) ? vehiculos : [];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-800">Aceptar envío</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-slate-600">
              Seleccioná el vehículo con el que vas a realizar este envío.
            </p>

            {list.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
                No tenés vehículos cargados. Creá uno en <b>Vehículos</b> para poder aceptar envíos.
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Vehículo</label>
                <select
                  value={vehiculoId || ""}
                  onChange={(e) => setVehiculoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="" disabled>Elegí un vehículo...</option>

                  {list.map((v) => {
                    const id = v._id || v.id;
                    const marca = v.marca || "";
                    const modelo = v.modelo || "";
                    const patente = v.patente ? ` • ${v.patente}` : "";
                    const label = (`${marca} ${modelo}`.trim() + patente) || `Vehículo ${id}`;
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || !vehiculoId || list.length === 0}
              className={[
                "rounded-xl px-4 py-2 text-sm font-extrabold text-white",
                (loading || !vehiculoId || list.length === 0)
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-700 hover:bg-blue-800",
              ].join(" ")}
            >
              {loading ? "Aceptando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}