import { useEffect, useMemo, useState } from "react";
import {
  Package,
  DollarSign,
  CheckCircle2,
  Boxes,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getMyShipments } from "../../services/shipmentServices";

const COLORS = ["#ec4899", "#60a5fa", "#86efac", "#fdba74", "#c084fc"];

const MESES_ORDER = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default function Estadisticas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [envios, setEnvios] = useState([]);

  const [filters, setFilters] = useState({
    fechaDesde: "",
    fechaHasta: "",
    ciudad: "",
    medioPago: "",
    estado: "",
    comisionista: "",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await getMyShipments();
        const data = Array.isArray(res) ? res : res?.data;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.envios)
            ? data.envios
            : Array.isArray(data?.historial)
              ? data.historial
              : [];

        if (alive) setEnvios(list);
      } catch (e) {
        if (alive) {
          setError(e?.message || "No se pudieron cargar las estadísticas.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  const filterOptions = useMemo(() => {
    const ciudades = new Set();
    const mediosPago = new Set();
    const estados = new Set();
    const comisionistas = new Set();

    for (const envio of envios) {
      const ciudad = getCiudadVisible(envio);
      const medioPago = getMedioPago(envio);
      const estado = getEstadoEnvio(envio);
      const comisionista = getComisionista(envio);

      if (ciudad && ciudad !== "—") ciudades.add(ciudad);
      if (medioPago && medioPago !== "—") mediosPago.add(medioPago);
      if (estado && estado !== "—") estados.add(estado);
      if (comisionista && comisionista !== "—") comisionistas.add(comisionista);
    }

    return {
      ciudades: [...ciudades].sort(),
      mediosPago: [...mediosPago].sort(),
      estados: [...estados].sort(),
      comisionistas: [...comisionistas].sort(),
    };
  }, [envios]);

  const filteredEnvios = useMemo(() => {
    return envios.filter((envio) => {
      const fecha = getFechaObj(envio);
      const fechaISO = fecha ? toISODate(fecha) : "";
      const ciudad = getCiudadVisible(envio);
      const medioPago = getMedioPago(envio);
      const estado = getEstadoEnvio(envio);
      const comisionista = getComisionista(envio);

      if (filters.fechaDesde && (!fechaISO || fechaISO < filters.fechaDesde)) return false;
      if (filters.fechaHasta && (!fechaISO || fechaISO > filters.fechaHasta)) return false;
      if (filters.ciudad && ciudad !== filters.ciudad) return false;
      if (filters.medioPago && medioPago !== filters.medioPago) return false;
      if (filters.estado && estado !== filters.estado) return false;
      if (filters.comisionista && comisionista !== filters.comisionista) return false;

      return true;
    });
  }, [envios, filters]);

  const dashboard = useMemo(() => {
    const totalEnvios = filteredEnvios.length;
    let totalPaquetes = 0;
    let gastoTotal = 0;
    let entregados = 0;
    let incidencias = 0;

    const paquetesPorMes = {};
    const diasSemana = { Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0, Dom: 0 };
    const gastoPorMes = {};
    const mediosPago = {};
    const ultimos = [...filteredEnvios];

    for (const envio of filteredEnvios) {
      const fecha = getFechaObj(envio);
      const estado = getEstadoEnvio(envio);
      const costo = getCostoEnvio(envio);
      const cantidadPaquetes = getCantidadPaquetes(envio);
      const medioPago = getMedioPago(envio);

      totalPaquetes += cantidadPaquetes;
      gastoTotal += costo;

      if (estado === "ENTREGADO") entregados += 1;
      if (estado === "CANCELADO") incidencias += 1;

      if (fecha) {
        const mesRaw = fecha.toLocaleDateString("es-AR", { month: "short" });
        const mesLabel = mesRaw
          .replace(".", "")
          .replace(/^\w/, (c) => c.toUpperCase());

        paquetesPorMes[mesLabel] = (paquetesPorMes[mesLabel] || 0) + cantidadPaquetes;
        gastoPorMes[mesLabel] = (gastoPorMes[mesLabel] || 0) + costo;

        const diaIndex = fecha.getDay();
        const diaNombre = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][diaIndex];
        diasSemana[diaNombre] = (diasSemana[diaNombre] || 0) + 1;
      }

      mediosPago[medioPago] = (mediosPago[medioPago] || 0) + 1;
    }

    ultimos.sort((a, b) => {
      const fa = getFechaObj(a)?.getTime() || 0;
      const fb = getFechaObj(b)?.getTime() || 0;
      return fb - fa;
    });

    const promedioPaquetes =
      totalEnvios > 0 ? (totalPaquetes / totalEnvios).toFixed(1) : "0";

    const tasaEntregasExitosas =
      totalEnvios > 0 ? Math.round((entregados / totalEnvios) * 100) : 0;

    const paquetesPorMesData = sortMeses(
      Object.entries(paquetesPorMes).map(([mes, cantidad]) => ({ mes, cantidad }))
    );

    const diasMayorEnvioData = [
      { dia: "Lun", cantidad: diasSemana.Lun || 0 },
      { dia: "Mar", cantidad: diasSemana.Mar || 0 },
      { dia: "Mié", cantidad: diasSemana.Mié || 0 },
      { dia: "Jue", cantidad: diasSemana.Jue || 0 },
      { dia: "Vie", cantidad: diasSemana.Vie || 0 },
      { dia: "Sáb", cantidad: diasSemana.Sáb || 0 },
      { dia: "Dom", cantidad: diasSemana.Dom || 0 },
    ];

    const gastoPorMesData = sortMeses(
      Object.entries(gastoPorMes).map(([mes, monto]) => ({ mes, monto }))
    );

    const mediosPagoData = Object.entries(mediosPago).map(([name, value]) => ({
      name,
      value,
    }));

    const tasaEntregaData = [
      { name: "Exitosas", value: entregados || 0 },
      { name: "Con incidencias", value: incidencias || 0 },
    ];

    return {
      totalPaquetes,
      promedioPaquetes,
      gastoTotal,
      tasaEntregasExitosas,
      paquetesPorMesData,
      diasMayorEnvioData,
      gastoPorMesData,
      mediosPagoData,
      tasaEntregaData,
      ultimos: ultimos.slice(0, 8),
    };
  }, [filteredEnvios]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function limpiarFiltros() {
    setFilters({
      fechaDesde: "",
      fechaHasta: "",
      ciudad: "",
      medioPago: "",
      estado: "",
      comisionista: "",
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-100 p-3">
            <Package className="h-6 w-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
              Estadísticas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              KPIs, gráficos y filtros de tus envíos.
            </p>
          </div>
        </div>
        <div className="mt-4 h-px w-full bg-slate-200" />
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-800">Filtros</h2>
          </div>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Field label="Fecha desde">
            <input
              type="date"
              name="fechaDesde"
              value={filters.fechaDesde}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            />
          </Field>
          <Field label="Fecha hasta">
            <input
              type="date"
              name="fechaHasta"
              value={filters.fechaHasta}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            />
          </Field>
          <Field label="Ciudad">
            <select
              name="ciudad"
              value={filters.ciudad}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">Todas</option>
              {filterOptions.ciudades.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Medio de pago">
            <select
              name="medioPago"
              value={filters.medioPago}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">Todos</option>
              {filterOptions.mediosPago.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Estado de envío">
            <select
              name="estado"
              value={filters.estado}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">Todos</option>
              {filterOptions.estados.map((item) => (
                <option key={item} value={item}>{beautifyEstado(item)}</option>
              ))}
            </select>
          </Field>
          <Field label="Comisionista">
            <select
              name="comisionista"
              value={filters.comisionista}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">Todos</option>
              {filterOptions.comisionistas.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Boxes}
          label="Cantidad de paquetes enviados"
          value={loading ? "—" : dashboard.totalPaquetes}
        />
        <KpiCard
          icon={Package}
          label="Promedio de paquetes por envío"
          value={loading ? "—" : dashboard.promedioPaquetes}
        />
        <KpiCard
          icon={DollarSign}
          label="Gasto total"
          value={loading ? "—" : `$${dashboard.gastoTotal.toLocaleString("es-AR")}`}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Tasa de entregas exitosas"
          value={loading ? "—" : `${dashboard.tasaEntregasExitosas}%`}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Paquetes enviados por mes">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.paquetesPorMesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Días de mayor envío">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.diasMayorEnvioData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Evolución del gasto en envíos">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.gastoPorMesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="monto"
                  stroke="#7e22ce"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Medios de pago más utilizados">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.mediosPagoData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name} ${Math.round(percent * 100)}%`
                  }
                >
                  {dashboard.mediosPagoData.map((entry, index) => (
                    <Cell
                      key={`medio-${entry.name}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Tasa de entregas exitosas">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.tasaEntregaData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name} ${Math.round(percent * 100)}%`
                  }
                >
                  <Cell fill="#66bb6a" />
                  <Cell fill="#ef5350" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      {/* <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Detalle de envíos</h2>

        {loading ? (
          <div className="mt-6 text-sm text-slate-500">Cargando datos...</div>
        ) : dashboard.ultimos.length === 0 ? (
          <div className="mt-6 text-sm text-slate-500">
            No hay envíos para mostrar con los filtros actuales.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Ciudad</th>
                  <th className="px-4 py-2">Medio de pago</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Comisionista</th>
                  <th className="px-4 py-2">Costo</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.ultimos.map((envio) => (
                  <tr
                    key={envio?._id || envio?.id}
                    className="bg-slate-50 text-sm text-slate-700"
                  >
                    <td className="rounded-l-2xl px-4 py-3">
                      {formatFecha(getFechaObj(envio))}
                    </td>
                    <td className="px-4 py-3">{getCiudadVisible(envio)}</td>
                    <td className="px-4 py-3">{getMedioPago(envio)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge estado={getEstadoEnvio(envio)} />
                    </td>
                    <td className="px-4 py-3">{getComisionista(envio)}</td>
                    <td className="rounded-r-2xl px-4 py-3">
                      ${getCostoEnvio(envio).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section> */}
    </main>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-center shadow-sm">
      <div className="mb-3 flex justify-center">
        <div className="rounded-2xl bg-white p-3">
          <Icon className="h-5 w-5 text-blue-700" />
        </div>
      </div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-slate-800">{title}</h2>
      {children}
    </div>
  );
}

function StatusBadge({ estado }) {
  const styles = {
    ENTREGADO: "bg-green-100 text-green-700",
    PENDIENTE: "bg-yellow-100 text-yellow-800",
    ASIGNADO: "bg-blue-100 text-blue-800",
    EN_CAMINO: "bg-blue-100 text-blue-800",
    CANCELADO: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[estado] || "bg-slate-100 text-slate-700"
      }`}
    >
      {beautifyEstado(estado)}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFechaObj(envio) {
  const raw =
    envio?.fecha ||
    envio?.createdAt ||
    envio?.fecha_creacion ||
    envio?.fechaRegistro ||
    envio?.updatedAt ||
    null;

  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatFecha(value) {
  if (!value) return "—";
  return value.toLocaleDateString("es-AR");
}

function toISODate(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getEstadoEnvio(envio) {
  return normalizeEstado(
    envio?.estado ??
      envio?.estadoId ??
      envio?.estado_actual ??
      envio?.status ??
      envio?.estadoNombre ??
      envio?.estado_nombre ??
      envio?.estado?.nombre ??
      envio?.estado?.id ??
      ""
  );
}

function normalizeEstado(value) {
  const raw = String(value || "").trim().toUpperCase();

  if (!raw) return "—";

  if (["ENTREGADO", "COMPLETADO", "COMPLETADA", "FINALIZADO", "FINALIZADA"].includes(raw))
    return "ENTREGADO";
  if (["PENDIENTE", "CREADO", "PUBLICADO"].includes(raw))
    return "PENDIENTE";
  if (["ASIGNADO", "ACEPTADO"].includes(raw))
    return "ASIGNADO";
  if (["EN_CAMINO", "EN CURSO", "EN_TRANSITO", "EN TRÁNSITO", "EN TRANSITO"].includes(raw))
    return "EN_CAMINO";
  if (["CANCELADO", "CANCELADA", "ELIMINADO", "ARCHIVADO"].includes(raw))
    return "CANCELADO";

  return raw;
}

function beautifyEstado(estado) {
  if (estado === "EN_CAMINO") return "En camino";
  if (estado === "PENDIENTE") return "Pendiente";
  if (estado === "ASIGNADO") return "Asignado";
  if (estado === "ENTREGADO") return "Entregado";
  if (estado === "CANCELADO") return "Cancelado";
  return estado || "—";
}

function getCiudadVisible(envio) {
  return (
    envio?.destinoCiudad?.localidadNombre ||
    envio?.origenCiudad?.localidadNombre ||
    envio?.direccion_destino?.ciudad ||
    envio?.direccion_origen?.ciudad ||
    envio?.ciudadDestino ||
    envio?.ciudadOrigen ||
    envio?.ciudad ||
    envio?.localidad ||
    "—"
  );
}

// FIX: usa metodo_pago_cliente (elegido por el cliente) como fuente primaria,
// pago.metodo (confirmado por el comisionista) como fallback.
function getMedioPago(envio) {
  return (
    envio?.metodo_pago_cliente ||
    envio?.pago?.metodo ||
    "—"
  );
}

function getComisionista(envio) {
  const nombreCompleto =
    envio?.comisionista?.nombre && envio?.comisionista?.apellido
      ? `${envio.comisionista.apellido}, ${envio.comisionista.nombre}`
      : null;

  return (
    nombreCompleto ||
    envio?.comisionistaNombre ||
    envio?.comisionista_nombre ||
    envio?.driverName ||
    envio?.transportista ||
    "—"
  );
}

// FIX: costo_estimado es el campo real del modelo — va primero en la cadena de fallbacks.
function getCostoEnvio(envio) {
  return (
    Number(
      envio?.costo_estimado ??
      envio?.costo_total ??
      envio?.costo ??
      envio?.precio ??
      envio?.monto ??
      envio?.total ??
      0
    ) || 0
  );
}

function getCantidadPaquetes(envio) {
  if (Array.isArray(envio?.paquetes)) {
    return envio.paquetes.length || 0;
  }
  return (
    Number(
      envio?.cantidad_paquetes ??
        envio?.cantidadPaquetes ??
        envio?.bultos ??
        1
    ) || 1
  );
}

function sortMeses(data) {
  return [...data].sort(
    (a, b) => MESES_ORDER.indexOf(a.mes) - MESES_ORDER.indexOf(b.mes)
  );
}
