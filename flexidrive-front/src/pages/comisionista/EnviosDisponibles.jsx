// flexidrive-front/src/pages/comisionista/EnviosDisponibles.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  Archive,
  Trash2,
  X,
  Eye,
  AlertCircle,
  ArrowUpDown,
  Search,
  CalendarDays,
  Funnel,
  ChevronDown,
} from "lucide-react";
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
  { value: "DEVUELTO",          label: "Devuelto" },
  { value: "archivado",         label: "Archivados" },
];

const SORT_OPTIONS = [
  { value: "fecha_entrega", label: "Fecha de entrega" },
  { value: "nro_envio",     label: "Número de envío" },
  { value: "cliente",       label: "Cliente" },
  { value: "origen",        label: "Origen" },
  { value: "destinatario",  label: "Destinatario" },
  { value: "destino",       label: "Destino" },
  { value: "estado",        label: "Estado" },
];

// ── Helpers de normalización ───────────────────────────────────────────────
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getShipmentNumber(envio) {
  return (
    envio?.nro_envio ||
    envio?.numero_envio ||
    envio?.numero ||
    envio?.shipmentNumber ||
    envio?.codigo ||
    envio?._id ||
    envio?.id ||
    ""
  );
}

function getEstadoEnvio(envio) {
  const raw = String(
    envio?.estadoId ??
      envio?.estado ??
      envio?.estado_actual ??
      envio?.status ??
      envio?.estadoNombre ??
      envio?.estado_nombre ??
      envio?.estado?.nombre ??
      envio?.estado?.id ??
      ""
  )
    .trim()
    .toUpperCase();

  if (["ENTREGADO", "COMPLETADO", "COMPLETADA", "FINALIZADO", "FINALIZADA"].includes(raw)) return "ENTREGADO";
  if (["EN_CAMINO", "EN CURSO", "EN_TRANSITO", "EN TRÁNSITO", "EN TRANSITO"].includes(raw)) return "EN_CAMINO";
  if (["RETIRADO"].includes(raw))          return "RETIRADO";
  if (["EN_RETIRO"].includes(raw))         return "EN_RETIRO";
  if (["DEMORADO_RETIRO"].includes(raw))   return "DEMORADO_RETIRO";
  if (["DEMORADO_ENTREGA"].includes(raw))  return "DEMORADO_ENTREGA";
  if (["ASIGNADO", "ACEPTADO"].includes(raw)) return "ASIGNADO";
  if (["PENDIENTE", "CREADO", "PUBLICADO"].includes(raw)) return "PENDIENTE";
  if (["CANCELADO"].includes(raw))         return "CANCELADO";
  if (["CANCELADO_RETORNO"].includes(raw)) return "CANCELADO_RETORNO";
  if (["DEVUELTO"].includes(raw))          return "DEVUELTO";

  return raw || "—";
}

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

  useEffect(() => {
    function onTestDateChanged(e) {
      const nuevaFecha = e?.detail?.TEST_DATE;
      if (nuevaFecha) setFechaHoySimulada(nuevaFecha);
      else setFechaHoySimulada(getTodayString());
    }
    window.addEventListener("test-date-changed", onTestDateChanged);
    return () => window.removeEventListener("test-date-changed", onTestDateChanged);
  }, []);

  const [estadosFiltro, setEstadosFiltro] = useState(new Set()); // vacío = todos
  const [openEstadoMenu, setOpenEstadoMenu] = useState(false);
  const estadoMenuRef = useRef(null);
  const [q, setQ]                       = useState("");
  const [fechaDesde, setFechaDesde]     = useState("");
  const [fechaHasta, setFechaHasta]     = useState("");
  const [loading, setLoading]           = useState(true);
  const [rows, setRows]                 = useState([]);

  const [sortBy, setSortBy]             = useState("fecha_entrega");
  const [sortDir, setSortDir]           = useState("asc");
  const [openSortMenu, setOpenSortMenu] = useState(false);
  const sortMenuRef                     = useRef(null);

  const mostrarArchivados = estadosFiltro.has("archivado");

  async function load() {
    setLoading(true);
    try {
      const res = await getMyShipments({
        archivado: mostrarArchivados ? "true" : undefined,
      });
      const raw = res?.data ?? res;
      const arr =
        Array.isArray(raw?.historial) ? raw.historial :
        Array.isArray(raw)            ? raw           : [];
      setRows(arr);
    } finally {
      setLoading(false);
    }
  }

  const {
    actionLoading, actionError, setActionError,
    waLink, setWaLink,
    vehiculos, vehiculoId, setVehiculoId,
    fechaRetiro, setFechaRetiro,
    franjaRetiro, setFranjaRetiro,
    openAceptar, abrirAceptar, cerrarAceptar, confirmarAceptar,
    handleRechazarOCancelarComisionista,
    handleArchivar,
    handleEliminar,
  } = useEnvioAcciones({ onSuccess: load, modo: "comisionista" });

  useEffect(() => { load(); }, [mostrarArchivados]); // eslint-disable-line

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setOpenSortMenu(false);
      }
      if (estadoMenuRef.current && !estadoMenuRef.current.contains(event.target)) {
        setOpenEstadoMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (mostrarArchivados) {
        if (!s.archivado) return false;
      } else if (estadosFiltro.size > 0) {
        if (!estadosFiltro.has(getEstadoEnvio(s))) return false;
      }

      if (q.trim()) {
        const needle = normalizeText(q);
        const haystack = normalizeText(
          [
            getShipmentNumber(s),
            s.nombreDestinatario,
            s.nombreCliente,
            s.destinoCiudad?.localidadNombre,
            s.origenCiudad?.localidadNombre,
            s.direccion_destino?.texto,
            s.direccion_origen?.texto,
          ]
            .filter(Boolean)
            .join(" ")
        );
        if (!haystack.includes(needle)) return false;
      }

      if (fechaDesde && s.fecha_entrega) {
        if (new Date(s.fecha_entrega) < new Date(fechaDesde)) return false;
      }
      if (fechaHasta && s.fecha_entrega) {
        if (new Date(s.fecha_entrega) > new Date(fechaHasta + "T23:59:59")) return false;
      }

      return true;
    });
  }, [rows, estadosFiltro, q, fechaDesde, fechaHasta, mostrarArchivados]);

  const sorted = useMemo(() => {
    const copy = [...filtered];

    function getValue(s) {
      switch (sortBy) {
        case "nro_envio":
          return normalizeText(getShipmentNumber(s));
        case "cliente":
          return normalizeText(s.nombreCliente);
        case "origen":
          return normalizeText(s.origenCiudad?.localidadNombre);
        case "destinatario":
          return normalizeText(s.nombreDestinatario || s.direccion_destino?.texto?.split(",")[0]);
        case "destino":
          return normalizeText(s.destinoCiudad?.localidadNombre);
        case "fecha_entrega":
          return s.fecha_entrega ? new Date(s.fecha_entrega).getTime() : 0;
        case "estado":
          return getEstadoEnvio(s);
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

  const estadosSeleccionados = ESTADOS.filter((e) => estadosFiltro.has(e.value));
  const hayFiltrosActivos    = estadosFiltro.size > 0 || fechaDesde || fechaHasta || q;
  const currentSortLabel     = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Fecha de entrega";

  return (
    <div className="m-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-700">Envíos asignados</h1>

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
          <a href={waLink} target="_blank" rel="noreferrer" className="font-semibold underline hover:text-green-900">
            Contactar por WhatsApp
          </a>
          <button onClick={() => setWaLink(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div ref={estadoMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenEstadoMenu((prev) => !prev)}
            className="group flex min-h-[32px] w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm transition-all hover:border-slate-400 hover:bg-slate-50"
          >
            <Funnel className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-500" />
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium text-slate-700">
                {estadosSeleccionados.length === 0
                  ? "Todos los estados"
                  : estadosSeleccionados.length === 1
                    ? estadosSeleccionados[0].label
                    : `${estadosSeleccionados.length} estados`}
              </div>
              <div className="truncate text-xs text-slate-500">
                {estadosSeleccionados.length === 0 ? "Sin filtro" : "Filtrando"}
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${openEstadoMenu ? "rotate-180" : ""}`} />
          </button>

          {openEstadoMenu && (
            <div className="absolute left-0 z-30 mt-2 w-full min-w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Filtrar por estado</p>
                {estadosFiltro.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setEstadosFiltro(new Set())}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="p-2">
                {ESTADOS.filter((e) => e.value !== "todos").map((option) => {
                  const active = estadosFiltro.has(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setEstadosFiltro((prev) => {
                          const next = new Set(prev);
                          if (next.has(option.value)) next.delete(option.value);
                          else next.add(option.value);
                          return next;
                        });
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition ${
                        active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition ${
                        active ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
                      }`}>
                        {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
              placeholder="Buscar por ciudad, nro. envío o destinatario"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            {q && (
              <button onClick={() => setQ("")} className="text-slate-400 transition hover:text-slate-600">
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
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${openSortMenu ? "rotate-180" : ""}`} />
          </button>

          {openSortMenu && (
            <div className="absolute right-0 z-30 mt-2 w-full min-w-[290px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Ordenar envíos</p>
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
                        active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
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
                      sortDir === "asc" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    A-Z ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortDir("desc")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      sortDir === "desc" ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
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
            onClick={() => { setEstadosFiltro(new Set()); setFechaDesde(""); setFechaHasta(""); setQ(""); }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <Loader />
      ) : sorted.length === 0 ? (
        <EmptyState title="No hay envíos para mostrar" subtitle="Probá cambiando el filtro o la búsqueda." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
          <table className="w-full text-left text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "11%" }} />  {/* Nro. envío — se apila, ok */}
              <col style={{ width: "11%" }} />  {/* Cliente — se apila, ok */}
              <col style={{ minWidth: "110px", width: "13%" }} />  {/* Origen */}
              <col style={{ width: "13%" }} />  {/* Destinatario */}
              <col style={{ minWidth: "110px", width: "13%" }} />  {/* Destino */}
              <col style={{ width: "10%" }} />  {/* Fecha entrega */}
              <col style={{ width: "11%" }} />  {/* Estado */}
              <col style={{ width: "18%" }} />  {/* Acciones — suficiente para 5 botones */}
            </colgroup>
            <thead className="bg-slate-50 text-slate-600">
              <tr className="border-b border-slate-300 font-semibold">
                <th className="px-3 py-3 text-left align-bottom">Nro. envío</th>
                <th className="px-3 py-3 text-left align-bottom">Cliente</th>
                <th className="px-3 py-3 text-left align-bottom">Origen</th>
                <th className="px-3 py-3 text-left align-bottom">Destinatario</th>
                <th className="px-3 py-3 text-left align-bottom">Destino</th>
                <th className="px-3 py-3 text-left align-bottom">Fecha entrega</th>
                <th className="px-3 py-3 text-left align-bottom">Estado</th>
                <th className="px-3 py-3 text-center align-bottom">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((s) => {
                const envioId     = s._id || s.id;
                const estadoRaw   = getEstadoEnvio(s);
                const estadoKey   = toEstadoKey(estadoRaw);
                const destino     = s.destinoCiudad?.localidadNombre || "—";
                const isActioning = (k) => actionLoading === envioId + "_" + k;

                return (
                  <tr key={envioId} className="border-b border-slate-200 transition-colors hover:bg-slate-50">
                    <td className="px-3 py-4 align-middle">
                      <Link to={`/comisionista/envios/${envioId}`} className="font-bold text-blue-700 hover:underline block truncate">
                        #{getShipmentNumber(s)}
                      </Link>
                    </td>
                    <td className="px-3 py-4 align-middle text-slate-700"><span className="block truncate">{s.nombreCliente || "—"}</span></td>
                    <td className="px-3 py-4 align-middle text-slate-700"><span className="block truncate">{s.origenCiudad?.localidadNombre || "—"}</span></td>
                    <td className="px-3 py-4 align-middle text-slate-700"><span className="block truncate">{s.nombreDestinatario || s.direccion_destino?.texto?.split(",")[0] || "—"}</span></td>
                    <td className="px-3 py-4 align-middle text-slate-700"><span className="block truncate">{destino}</span></td>
                    <td className="px-3 py-4 align-middle text-slate-700">{formatFechaEntrega(s.fecha_entrega)}</td>
                    <td className="px-3 py-4 align-middle">
                      <StatusBadge estado={estadoKey} label={estadoLabel(estadoRaw)} />
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn
                          icon={<Eye className="h-4 w-4" />}
                          title="Ver detalle"
                          onClick={() => navigate(`/comisionista/envios/${envioId}`)}
                          color="blue"
                        />
                        <ActionBtn
                          icon={<Check className="h-4 w-4" />}
                          title={puedeAceptar(estadoRaw) ? "Aceptar envío" : "Solo disponible en PENDIENTE"}
                          onClick={() => abrirAceptar(envioId, estadoRaw)}
                          disabled={!puedeAceptar(estadoRaw) || isActioning("aceptar")}
                          blocked={!puedeAceptar(estadoRaw)}
                          color="emerald"
                        />
                        <ActionBtn
                          icon={<X className="h-4 w-4" />}
                          title={puedeCancel(estadoRaw) ? (estadoRaw === "PENDIENTE" ? "Rechazar envío" : "Cancelar envío") : mensajeBloqueo("cancelar", estadoRaw)}
                          onClick={() => handleRechazarOCancelarComisionista(envioId, estadoRaw)}
                          disabled={!puedeCancel(estadoRaw) || isActioning("cancelar")}
                          blocked={!puedeCancel(estadoRaw)}
                          color="red"
                        />
                        <ActionBtn
                          icon={<Archive className="h-4 w-4" />}
                          title={puedeArchivarComisionista(estadoRaw) ? "Archivar envío" : "Solo disponible si está finalizado"}
                          onClick={() => handleArchivar(envioId, estadoRaw)}
                          disabled={!puedeArchivarComisionista(estadoRaw) || isActioning("archivar")}
                          blocked={!puedeArchivarComisionista(estadoRaw)}
                          color="amber"
                        />
                        <ActionBtn
                          icon={<Trash2 className="h-4 w-4" />}
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

function FilterBox({ icon, children }) {
  return (
    <div className="group flex min-h-[32px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm transition-all hover:border-slate-400 hover:bg-slate-50">
      <div className="shrink-0 transition group-hover:text-slate-500">{icon}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ActionBtn({ icon, title, onClick, disabled, blocked, color }) {
  const colors = {
    blue:    "hover:bg-blue-50 hover:text-blue-700",
    red:     "hover:bg-red-50 hover:text-red-600",
    amber:   "hover:bg-amber-50 hover:text-amber-600",
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
        blocked ? "cursor-not-allowed opacity-30" : `cursor-pointer text-slate-500 ${colors[color] || ""}`,
        disabled && !blocked ? "opacity-40" : "",
      ].join(" ")}
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
  const minDate = fromISODate(fechaHoySimulada || getTodayString());

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-800">Aceptar envío</h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
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
                    const id    = v._id || v.id;
                    const label = (`${v.marca || ""} ${v.modelo || ""}`.trim() + (v.patente ? ` • ${v.patente}` : "")) || `Vehículo ${id}`;
                    return <option key={id} value={id}>{label}</option>;
                  })}
                </select>
              </div>
            )}

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
                    key={f.value}
                    type="button"
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
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
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
