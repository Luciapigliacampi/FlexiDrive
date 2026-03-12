import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Archive,
  Trash2,
  X,
  Eye,
  AlertCircle,
  ArrowUpDown,
  Plus,
  Search,
  CalendarDays,
  Funnel,
  ChevronDown,
  Check,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { getMyShipments } from "../../services/shipmentServices";
import {
  useEnvioAcciones,
  puedeCancel,
  puedeArchivar,
  puedeEliminar,
  mensajeBloqueo,
} from "../../hooks/useShipments";
import { toEstadoKey, estadoLabel } from "../../utils/estadoUtils";
import { formatFechaEntrega } from "../../utils/fechas";

const ESTADOS = [
  { value: "todos",             label: "Todos" },
  { value: "PENDIENTE",         label: "Pendiente" },
  { value: "ASIGNADO",          label: "Asignado" },
  { value: "EN_RETIRO",         label: "En retiro" },
  { value: "EN_CAMINO",         label: "En camino" },
  { value: "DEMORADO_RETIRO",   label: "Demorado (retiro)" },
  { value: "DEMORADO_ENTREGA",  label: "Demorado (entrega)" },
  { value: "ENTREGADO",         label: "Entregado" },
  { value: "CANCELADO",         label: "Cancelado" },
  { value: "CANCELADO_RETORNO", label: "Cancelado en tránsito" },
  { value: "archivado", label: "Archivados" },
];

const SORT_OPTIONS = [
  { value: "fecha_entrega", label: "Fecha de entrega" },
  { value: "nro_envio", label: "Número de envío" },
  { value: "destinatario", label: "Destinatario" },
  { value: "destino", label: "Destino" },
  { value: "comisionista", label: "Comisionista" },
  { value: "estado", label: "Estado" },
];

export default function HistorialEnvios() {
  const navigate = useNavigate();

  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [q, setQ] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [sortBy, setSortBy] = useState("fecha_entrega");
  const [sortDir, setSortDir] = useState("asc");
  const [openSortMenu, setOpenSortMenu] = useState(false);

  const sortMenuRef = useRef(null);

  const mostrarArchivados = estadoFiltro === "archivado";

  async function load() {
    setLoading(true);
    try {
      const res = await getMyShipments({
        archivado: mostrarArchivados ? "true" : undefined,
      });

      const raw = res?.data ?? res;
      const arr = Array.isArray(raw?.historial)
        ? raw.historial
        : Array.isArray(raw)
          ? raw
          : [];

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
    handleCancelar,
    handleArchivar,
    handleEliminar,
  } = useEnvioAcciones({ onSuccess: load });

  useEffect(() => {
    load();
  }, [estadoFiltro]); // eslint-disable-line

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setOpenSortMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (mostrarArchivados) {
        if (!s.archivado) return false;
      } else if (estadoFiltro !== "todos") {
        if ((s.estadoId || "").toUpperCase() !== estadoFiltro) return false;
      }

      if (q.trim()) {
        const text = q.toLowerCase();

        const haystack = [
          s.destinoCiudad?.localidadNombre,
          s.origenCiudad?.localidadNombre,
          s.nro_envio,
          s.nombreComisionista,
          s.nombreDestinatario,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(text)) return false;
      }

      if (fechaDesde && s.fecha_entrega) {
        if (new Date(s.fecha_entrega) < new Date(fechaDesde)) return false;
      }

      if (fechaHasta && s.fecha_entrega) {
        if (new Date(s.fecha_entrega) > new Date(fechaHasta + "T23:59:59")) {
          return false;
        }
      }

      return true;
    });
  }, [rows, estadoFiltro, q, fechaDesde, fechaHasta, mostrarArchivados]);

  const sorted = useMemo(() => {
    const copy = [...filtered];

    function getValue(s) {
      switch (sortBy) {
        case "nro_envio":
          return String(s.nro_envio || s._id || s.id || "").toLowerCase();

        case "destinatario":
          return String(
            s.nombreDestinatario ||
              s.direccion_destino?.texto?.split(",")[0] ||
              ""
          ).toLowerCase();

        case "destino":
          return String(s.destinoCiudad?.localidadNombre || "").toLowerCase();

        case "comisionista":
          return String(
            s.nombreComisionista || (s.comisionistaId ? "Asignado" : "Sin asignar")
          ).toLowerCase();

        case "fecha_entrega":
          return s.fecha_entrega ? new Date(s.fecha_entrega).getTime() : 0;

        case "estado":
          return String(s.estadoId || "").toUpperCase();

        default:
          return "";
      }
    }

    copy.sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);

      let result = 0;

      if (typeof aVal === "number" && typeof bVal === "number") {
        result = aVal - bVal;
      } else {
        result = String(aVal).localeCompare(String(bVal), "es", {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDir === "asc" ? result : -result;
    });

    return copy;
  }, [filtered, sortBy, sortDir]);

  const hayFiltrosActivos =
    estadoFiltro !== "todos" || fechaDesde || fechaHasta || q;

  const currentSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortBy)?.label ||
    "Fecha de entrega";

  return (
    <div className="m-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-700">
          Mis Envíos
        </h1>

        <button
          type="button"
          onClick={() => navigate("/cliente/solicitar-envio")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Solicitar envío
        </button>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {waLink && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          <span>Envío cancelado. Coordiná la devolución:</span>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline hover:text-green-900"
          >
            Contactar comisionista por WhatsApp
          </a>
          <button onClick={() => setWaLink(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <FilterBox icon={<Funnel className="h-4 w-4 text-slate-400" />}>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </FilterBox>

        <FilterBox icon={<CalendarDays className="h-4 w-4 text-slate-400" />}>
          <div className="flex w-full items-center gap-2">
            <span className="shrink-0 text-sm text-slate-500">Desde</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
        </FilterBox>

        <FilterBox icon={<CalendarDays className="h-4 w-4 text-slate-400" />}>
          <div className="flex w-full items-center gap-2">
            <span className="shrink-0 text-sm text-slate-500">Hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
        </FilterBox>

        <FilterBox icon={<Search className="h-4 w-4 text-slate-400" />}>
          <div className="flex w-full items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por ciudad, envío o comisionista"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-slate-400 transition hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </FilterBox>

        <div ref={sortMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenSortMenu((prev) => !prev)}
            className="group flex min-h-[32px] w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm transition-all hover:border-slate-400 hover:bg-slate-50"
          >
            <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-500" />
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium text-slate-700">
                Ordenar por {currentSortLabel}
              </div>
              <div className="truncate text-xs text-slate-500">
                {sortDir === "asc" ? "A-Z ↓" : "Z-A ↑"}
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                openSortMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          {openSortMenu && (
            <div className="absolute right-0 z-30 mt-2 w-full min-w-[290px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  Ordenar envíos
                </p>
              </div>

              <div className="p-2">
                {SORT_OPTIONS.map((option) => {
                  const active = sortBy === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSortBy(option.value)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition ${
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{option.label}</span>
                      {active && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}

                <div className="my-2 border-t border-slate-100" />

                <div className="grid grid-cols-2 gap-2 px-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setSortDir("asc")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      sortDir === "asc"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    A-Z ↓
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortDir("desc")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      sortDir === "desc"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Z-A ↑
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {hayFiltrosActivos && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setEstadoFiltro("todos");
              setFechaDesde("");
              setFechaHasta("");
              setQ("");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </button>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No hay envíos para mostrar"
          subtitle="Probá cambiando el filtro o la búsqueda."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="border-b border-slate-300 font-semibold">
                <th className="px-5 py-4">Número de envío</th>
                <th className="px-5 py-4">Destinatario</th>
                <th className="px-5 py-4">Destino</th>
                <th className="px-5 py-4">Comisionista</th>
                <th className="px-5 py-4">Fecha de entrega</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((s) => {
                const envioId = s._id || s.id;
                const estadoRaw = s.estadoId || "PENDIENTE";
                const estadoKey = toEstadoKey(estadoRaw);
                const destino = s.destinoCiudad?.localidadNombre || "—";
                const isActioning = (k) => actionLoading === envioId + "_" + k;

                return (
                  <tr
                    key={envioId}
                    className="border-b border-slate-200 transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <Link
                        to={`/cliente/envios/${envioId}`}
                        className="font-bold text-blue-700 hover:underline"
                      >
                        #{s.nro_envio || envioId}
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {s.nombreDestinatario ||
                        s.direccion_destino?.texto?.split(",")[0] ||
                        "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-700">{destino}</td>

                    <td className="px-5 py-4 text-slate-700">
                      {s.nombreComisionista ||
                        (s.comisionistaId ? "Asignado" : "Sin asignar")}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {formatFechaEntrega(s.fecha_entrega)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        estado={estadoKey}
                        label={estadoLabel(estadoRaw)}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn
                          icon={<Eye className="h-4 w-4" />}
                          title="Ver detalle"
                          onClick={() => navigate(`/cliente/envios/${envioId}`)}
                          color="blue"
                        />

                        <ActionBtn
                          icon={<X className="h-4 w-4" />}
                          title={
                            puedeCancel(estadoRaw)
                              ? "Cancelar envío"
                              : mensajeBloqueo("cancelar", estadoRaw)
                          }
                          onClick={() => handleCancelar(envioId, estadoRaw)}
                          disabled={
                            !puedeCancel(estadoRaw) || isActioning("cancelar")
                          }
                          blocked={!puedeCancel(estadoRaw)}
                          color="red"
                        />

                        <ActionBtn
                          icon={<Archive className="h-4 w-4" />}
                          title={
                            puedeArchivar(estadoRaw)
                              ? "Archivar envío"
                              : mensajeBloqueo("archivar", estadoRaw)
                          }
                          onClick={() => handleArchivar(envioId, estadoRaw)}
                          disabled={
                            !puedeArchivar(estadoRaw) || isActioning("archivar")
                          }
                          blocked={!puedeArchivar(estadoRaw)}
                          color="amber"
                        />

                        <ActionBtn
                          icon={<Trash2 className="h-4 w-4" />}
                          title={
                            puedeEliminar(estadoRaw)
                              ? "Eliminar del historial"
                              : mensajeBloqueo("eliminar", estadoRaw)
                          }
                          onClick={() => handleEliminar(envioId, estadoRaw)}
                          disabled={
                            !puedeEliminar(estadoRaw) || isActioning("eliminar")
                          }
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
        </div>
      )}
    </div>
  );
}

function FilterBox({ icon, children }) {
  return (
    <div className="group flex min-h-[32px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm transition-all hover:border-slate-400 hover:bg-slate-50">
      <div className="shrink-0 transition group-hover:text-slate-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ActionBtn({ icon, title, onClick, disabled, blocked, color }) {
  const colors = {
    blue: "hover:bg-blue-50 hover:text-blue-700",
    red: "hover:bg-red-50 hover:text-red-600",
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