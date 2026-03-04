//flexidrive-front\src\pages\cliente\HistorialEnvios.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, Trash2, X, Eye, AlertCircle } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { getMyShipments } from "../../services/shipmentServices";
import {
  useEnvioAcciones, puedeCancel, puedeArchivar, puedeEliminar, mensajeBloqueo,
} from "../../hooks/useShipments";
import { toEstadoKey, estadoLabel } from "../../utils/estadoUtils";

const ESTADOS = [
  { value: "todos",             label: "Todos" },
  { value: "PENDIENTE",         label: "Pendiente" },
  { value: "ASIGNADO",          label: "Asignado" },
  { value: "EN_RETIRO",         label: "En retiro" },
  { value: "EN_CAMINO",         label: "En camino" },
  { value: "DEMORADO",          label: "Demorado" },
  { value: "ENTREGADO",         label: "Entregado" },
  { value: "CANCELADO",         label: "Cancelado" },
  { value: "CANCELADO_RETORNO", label: "Cancelado en tránsito" },
  { value: "archivado",         label: "Archivados" },
];

export default function HistorialEnvios() {
  const navigate              = useNavigate();
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [q, setQ]             = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows]       = useState([]);

  const mostrarArchivados = estadoFiltro === "archivado";

  async function load() {
    setLoading(true);
    try {
      const res = await getMyShipments({
        archivado: mostrarArchivados ? "true" : undefined,
      });
      const raw = res?.data ?? res;
      const arr = Array.isArray(raw?.historial) ? raw.historial
                : Array.isArray(raw) ? raw : [];
      setRows(arr);
    } finally {
      setLoading(false);
    }
  }

  const {
    actionLoading, actionError, setActionError, waLink, setWaLink,
    handleCancelar, handleArchivar, handleEliminar,
  } = useEnvioAcciones({ onSuccess: load });

  useEffect(() => { load(); }, [estadoFiltro]); // eslint-disable-line

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (mostrarArchivados) {
      if (!s.archivado) return false;
    } else {
      // filtro por estado normal
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
          s.nombreComisionista,
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
    <div className="space-y-6 m-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-700">Mis Envíos</h1>

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

      {/* WhatsApp link para cancelación en tránsito */}
      {waLink && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          <span>Envío cancelado. Coordiná la devolución:</span>
          <a href={waLink} target="_blank" rel="noreferrer"
            className="font-semibold underline hover:text-green-900">
            Contactar comisionista por WhatsApp
          </a>
          <button onClick={() => setWaLink(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
          className="rounded-md border-slate-300 border bg-white px-4 py-2 text-slate-700 outline-none ">
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 rounded-md border-slate-300 border bg-white px-4 py-2">
          <span className="text-sm text-slate-500">Desde</span>
          <input type="date" value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="outline-none text-slate-700 text-sm" />
        </div>
        <div className="flex items-center gap-2 rounded-md border-slate-300 border bg-white px-4 py-2">
          <span className="text-sm text-slate-500">Hasta</span>
          <input type="date" value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="outline-none text-slate-700 text-sm" />
        </div>

        <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-md border-slate-300 border bg-white px-4 py-2">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por ciudad, nro. envío o comisionista"
            className="w-full outline-none text-slate-700 text-sm" />
          {q && (
            <button onClick={() => setQ("")} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Limpiar filtros — mostrar solo si hay algo activo */}
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
      {loading ? <Loader /> : filtered.length === 0 ? (
        <EmptyState title="No hay envíos para mostrar"
          subtitle="Probá cambiando el filtro o la búsqueda." />
      ) : (
        <div className="overflow-x-auto rounded-md border-slate-300 border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 ">
              <tr className="font-semibold divide-y-1 divide-slate-300">
                <th className="px-5 py-4 ">Nro. envío</th>
                <th className="px-5 py-4">Destinatario</th>
                <th className="px-5 py-4">Destino</th>
                <th className="px-5 py-4">Comisionista</th>
                <th className="px-5 py-4">Fecha entrega</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const envioId = s._id || s.id;
                const estadoRaw = s.estadoId || "PENDIENTE";
const estadoKey = toEstadoKey(estadoRaw);
                const destino = s.destinoCiudad?.localidadNombre || "—";
                const fechaEntrega = s.fecha_entrega
                  ? new Date(s.fecha_entrega).toLocaleDateString("es-AR")
                  : "—";
                const isActioning = (k) => actionLoading === envioId + "_" + k;

                return (
                  <tr key={envioId} className="hover:bg-slate-50 transition-colors border border-slate-300 divide-y-1 divide-slate-300">
                    <td className="px-5 py-4">
                      <Link to={`/cliente/envios/${envioId}`}
                        className="font-bold text-blue-700 hover:underline">
                        #{s.nro_envio || envioId}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
  {s.nombreDestinatario || s.direccion_destino?.texto?.split(",")[0] || "—"}
</td>
                    <td className="px-5 py-4 text-slate-700">{destino}</td>
                    <td className="px-5 py-4 text-slate-700">
                      {s.nombreComisionista || (s.comisionistaId ? "Asignado" : "Sin asignar")}
                    </td>
                    <td className="px-5 py-4 text-slate-700">{fechaEntrega}</td>
                    <td className="px-5 py-4">
                      <StatusBadge 
  estado={estadoKey} 
  label={estadoLabel(estadoRaw)} 
/>
                    </td>
                    <td className="px-5 py-4 ">
                      <div className="flex items-center justify-center gap-1 ">
                        {/* Ver */}
                        <ActionBtn
                          icon={<Eye className="w-4 h-4" />}
                          title="Ver detalle"
                          onClick={() => navigate(`/cliente/envios/${envioId}`)}
                          color="blue"
                        />

                        {/* Cancelar */}
                        <ActionBtn
                          icon={<X className="w-4 h-4" />}
                          title={puedeCancel(estadoRaw ) ? "Cancelar envío" : mensajeBloqueo("cancelar", estadoRaw )}
                          onClick={() => handleCancelar(envioId, estadoRaw )}
                          disabled={!puedeCancel(estadoRaw ) || isActioning("cancelar")}
                          blocked={!puedeCancel(estadoRaw )}
                          color="red"
                        />

                        {/* Archivar */}
                        <ActionBtn
                          icon={<Archive className="w-4 h-4" />}
                          title={puedeArchivar(estadoRaw ) ? "Archivar envío" : mensajeBloqueo("archivar", estadoRaw )}
                          onClick={() => handleArchivar(envioId, estadoRaw )}
                          disabled={!puedeArchivar(estadoRaw ) || isActioning("archivar")}
                          blocked={!puedeArchivar(estadoRaw )}
                          color="amber"
                        />

                        {/* Eliminar */}
                        <ActionBtn
                          icon={<Trash2 className="w-4 h-4" />}
                          title={puedeEliminar(estadoRaw ) ? "Eliminar del historial" : mensajeBloqueo("eliminar", estadoRaw )}
                          onClick={() => handleEliminar(envioId, estadoRaw )}
                          disabled={!puedeEliminar(estadoRaw ) || isActioning("eliminar")}
                          blocked={!puedeEliminar(estadoRaw )}
                          color="red"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Botón de acción con tooltip nativo y estado bloqueado visual
function ActionBtn({ icon, title, onClick, disabled, blocked, color }) {
  const colors = {
    blue:  "hover:bg-blue-50 hover:text-blue-700",
    red:   "hover:bg-red-50 hover:text-red-600",
    amber: "hover:bg-amber-50 hover:text-amber-600",
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