import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ClipboardList,
  Route,
  CheckCircle2,
  PackageCheck,
  PlayCircle,
  StopCircle,
  AlertCircle,
  X,
  DollarSign,
  TrendingUp,
  Map,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { toEstadoKey, estadoLabel } from "../../utils/estadoUtils";
import { Card } from "../../components/UI";
import StatusBadge from "../../components/StatusBadge";
import MapaRutaOptimizada from "../../components/MapaRutaOptimizada";
import { getTodayString } from "../../utils/testDate";

import {
  getDashboardResumen,
  getAgendaHoy,
  generarRutaHoy,
  getRutaActiva,
  confirmarFechaRetiro,
  completarParada,
  getEstadisticasComisionista,
} from "../../services/comisionistaServices";

import {
  marcarRetirado,
  marcarEntregado,
  iniciarViaje,
  finalizarViaje,
} from "../../services/shipmentServices";

import api from "../../services/api";

const IA_ROUTE_BASE = import.meta.env.VITE_IA_API_URL || "http://localhost:3002";

const PUEDE_RETIRAR = ["ASIGNADO", "EN_RETIRO"];
const PUEDE_ENTREGAR = ["RETIRADO", "EN_CAMINO", "DEMORADO"];

export default function DashboardComisionista() {
  const username = localStorage.getItem("username") || "Usuario";
  const userRaw = localStorage.getItem("user");
  const userId = userRaw ? JSON.parse(userRaw)?.id : null;

  const [loading, setLoading] = useState(true);
  const [loadingRuta, setLoadingRuta] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [rutaError, setRutaError] = useState("");

  const [resumen, setResumen] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [ruta, setRuta] = useState(null);
  const [viajeIniciado, setViajeIniciado] = useState(false);
  const [estadisticas, setEstadisticas] = useState(null);

  const [fechaHoy, setFechaHoy] = useState(() => getTodayString());

  /* ─── Carga agenda ─────────────────────────────────────────────────────── */
  const cargarAgenda = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r1, r2] = await Promise.all([
        getDashboardResumen({ date: fechaHoy }),
        getAgendaHoy({ date: fechaHoy }),
      ]);

      setResumen(r1);
      setAgenda(Array.isArray(r2?.items ?? r2) ? (r2?.items ?? r2) : []);
    } catch (e) {
      setError(e?.message || "No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [fechaHoy]);

  const cargarEstadisticas = useCallback(async () => {
    if (!userId) return;

    try {
      const data = await getEstadisticasComisionista(userId);
      setEstadisticas(data || null);
    } catch (e) {
      console.error("No se pudieron cargar las estadísticas", e);
      setEstadisticas(null);
    }
  }, [userId]);

  useEffect(() => {
    cargarAgenda();
    cargarEstadisticas();
  }, [cargarAgenda, cargarEstadisticas]);

  /* ─── Ruta optimizada ──────────────────────────────────────────────────── */
  const cargarOGenerarRuta = useCallback(
    async (forceRegenerate = false) => {
      if (!userId) return;
      setLoadingRuta(true);
      setRutaError("");

      try {
        if (!forceRegenerate) {
          try {
            const rutaActiva = await getRutaActiva({ comisionistaId: userId });

            if (rutaActiva?.viaje_iniciado === true) {
              // seguir
            } else {
              setRuta(rutaActiva);
              setViajeIniciado(false);
              return;
            }
          } catch (e) {
            if (e?.response?.status !== 404) throw e;
            setRuta(null);
            setViajeIniciado(false);
            return;
          }
        }

        let viajeYaIniciado = false;
        try {
          const rutaActiva = await getRutaActiva({ comisionistaId: userId });
          viajeYaIniciado = rutaActiva?.viaje_iniciado === true;
        } catch {}

        let posActual = null;
        if (navigator.geolocation) {
          posActual = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                resolve({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                }),
              () => resolve(null),
              { timeout: 3000 }
            );
          });
        }

        const nuevaRuta = await generarRutaHoy({
          comisionistaId: userId,
          fecha: fechaHoy,
          latActual: posActual?.lat,
          lngActual: posActual?.lng,
        });

        setRuta(nuevaRuta);
        setViajeIniciado(
          nuevaRuta?.viaje_iniciado === true || viajeYaIniciado
        );
      } catch (e) {
        if (e?.response?.status === 404 || e?.response?.status === 500) {
          setRuta(null);
          setViajeIniciado(false);
        } else {
          setRutaError(e?.message || "No se pudo generar la ruta.");
        }
      } finally {
        setLoadingRuta(false);
      }
    },
    [userId, fechaHoy]
  );

  useEffect(() => {
    cargarOGenerarRuta();
  }, [cargarOGenerarRuta]);

  /* ─── Listener panel de pruebas ────────────────────────────────────────── */
  useEffect(() => {
    function onTestDateChanged(e) {
      const nuevaFecha = e?.detail?.TEST_DATE;
      if (nuevaFecha) setFechaHoy(nuevaFecha);
      cargarAgenda();
      cargarOGenerarRuta(true);
      cargarEstadisticas();
    }

    window.addEventListener("test-date-changed", onTestDateChanged);
    return () =>
      window.removeEventListener("test-date-changed", onTestDateChanged);
  }, [cargarAgenda, cargarOGenerarRuta, cargarEstadisticas]);

  /* ─── Acciones ─────────────────────────────────────────────────────────── */
  const withLoading = useCallback(
    async (key, fn) => {
      setActionLoading(key);
      setActionError("");
      try {
        await fn();
        await cargarAgenda();
        await cargarOGenerarRuta(true);
        await cargarEstadisticas();
      } catch (e) {
        setActionError(
          e?.response?.data?.message || e?.message || "Error al actualizar."
        );
      } finally {
        setActionLoading(null);
      }
    },
    [cargarAgenda, cargarOGenerarRuta, cargarEstadisticas]
  );

  const handleRetirar = useCallback(
    (id) => withLoading(`${id}_retirar`, () => marcarRetirado(id)),
    [withLoading]
  );

  const handleEntregar = useCallback(
    (id) => {
      if (!confirm("¿Confirmar entrega de este paquete?")) return;
      withLoading(`${id}_entregar`, () => marcarEntregado(id));
    },
    [withLoading]
  );

  const handleIniciarViaje = useCallback(() => {
    if (
      !confirm(
        "¿Iniciar el viaje del día? Esto actualizará el estado de todos los envíos."
      )
    ) {
      return;
    }

    withLoading("iniciar_viaje", async () => {
      await iniciarViaje(fechaHoy);
      await api.patch(`${IA_ROUTE_BASE}/api/rutas/iniciar/${userId}`).catch(() => {});
      setViajeIniciado(true);
    });
  }, [withLoading, fechaHoy, userId]);

  const handleFinalizarViaje = useCallback(() => {
    if (!confirm("¿Finalizar el viaje del día? Esto cerrará la ruta activa.")) {
      return;
    }

    withLoading("finalizar_viaje", async () => {
      await finalizarViaje(fechaHoy);
      setViajeIniciado(false);
      setRuta(null);
    });
  }, [withLoading, fechaHoy]);

  const handleCompletar = useCallback(
    async (envioId, tipo, posActual) => {
      await completarParada({
        envioId,
        tipo,
        comisionistaId: userId,
        fecha: fechaHoy,
        latActual: posActual?.lat,
        lngActual: posActual?.lng,
      });
      setTimeout(() => cargarOGenerarRuta(false), 1500);
    },
    [userId, fechaHoy, cargarOGenerarRuta]
  );

  const handleConfirmarRetiro = useCallback(
    async (envioId, fecha) => {
      await confirmarFechaRetiro({
        envioId,
        fecha,
        comisionistaId: userId,
      });

      setRuta((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orden_entregas: prev.orden_entregas.map((p) =>
            String(p.envioId) === String(envioId) && p.tipo === "RETIRO"
              ? { ...p, fecha_retiro_confirmada: fecha + "T12:00:00.000Z" }
              : p
          ),
        };
      });
    },
    [userId]
  );

  /* ─── Métricas ─────────────────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const r = resumen || {};
    return [
      { value: loading ? "—" : String(r.enviosHoy ?? 0), label: "Envíos hoy" },
      { value: loading ? "—" : String(r.enRuta ?? 0), label: "En ruta" },
      {
        value: loading ? "—" : String(r.pendientesRetiro ?? 0),
        label: "Pendientes de retiro",
      },
      {
        value: loading ? "—" : String(r.calificacion ?? "—"),
        label: "Calificación",
      },
    ];
  }, [resumen, loading]);

  const stats = useMemo(() => {
    const ingresosTotales = Number(estadisticas?.ingresosTotales || 0);
    const ingresoPromedioViaje = Number(
      estadisticas?.ingresoPromedio ||
        estadisticas?.ingresoPromedioViaje ||
        0
    );
    const distanciaPromedioViaje = Number(
      estadisticas?.distanciaPromedio ||
        estadisticas?.distanciaPromedioViaje ||
        0
    );

    const diasMasEntregas =
      Array.isArray(estadisticas?.diasMasEntregas) &&
      estadisticas.diasMasEntregas.length > 0
        ? estadisticas.diasMasEntregas
        : [
            { dia: "Lun", entregas: 0 },
            { dia: "Mar", entregas: 0 },
            { dia: "Mié", entregas: 0 },
            { dia: "Jue", entregas: 0 },
            { dia: "Vie", entregas: 0 },
            { dia: "Sáb", entregas: 0 },
            { dia: "Dom", entregas: 0 },
          ];

    const comparativaEnvios =
      Array.isArray(estadisticas?.comparativaEnvios) &&
      estadisticas.comparativaEnvios.length > 0
        ? estadisticas.comparativaEnvios
        : [
            { tipo: "Entregas", cantidad: Number(estadisticas?.entregas || 0) },
            { tipo: "Retiros", cantidad: Number(estadisticas?.retiros || 0) },
          ];

    return {
      ingresosTotales,
      ingresoPromedioViaje,
      distanciaPromedioViaje,
      diasMasEntregas,
      comparativaEnvios,
    };
  }, [estadisticas]);

  const hayEnviosHoy = agenda.length > 0;

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-700">
            Hola, {username}
          </h1>
          <p className="mt-2 text-xl font-semibold text-slate-600">
            ¿Qué querés hacer hoy?
          </p>
        </div>

        {hayEnviosHoy &&
          (viajeIniciado ? (
            <button
              type="button"
              onClick={handleFinalizarViaje}
              disabled={actionLoading === "finalizar_viaje"}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-50 shadow"
            >
              <StopCircle className="h-5 w-5" />
              {actionLoading === "finalizar_viaje"
                ? "Finalizando..."
                : "Finalizar viaje"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleIniciarViaje}
              disabled={actionLoading === "iniciar_viaje"}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-800 disabled:opacity-50 shadow"
            >
              <PlayCircle className="h-5 w-5" />
              {actionLoading === "iniciar_viaje"
                ? "Iniciando..."
                : "Iniciar viaje del día"}
            </button>
          ))}
      </div>

      {(error || actionError) && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error || actionError}</span>
          <button
            className="ml-auto"
            onClick={() => {
              setError("");
              setActionError("");
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickAction
          to="/comisionista/crear-envio"
          icon={<Package className="h-6 w-6" />}
          title="Crear envío"
        />
        <QuickAction
          to="/comisionista/envios"
          icon={<ClipboardList className="h-6 w-6" />}
          title="Ver envíos"
        />
        <QuickAction
          to="/comisionista/rutas"
          icon={<Route className="h-6 w-6" />}
          title="Gestionar rutas"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 gap-y-4 md:grid-cols-4 md:divide-x md:divide-slate-200 p-4">
          {metrics.map((m) => (
            <Metric key={m.label} value={m.value} label={m.label} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-blue-800 mb-3">
              Entregas y retiros programados para hoy
            </h2>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="max-h-[255px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
                    <tr className="text-xs font-bold uppercase tracking-wide">
                      <th className="px-3 py-3 w-10">#</th>
                      <th className="px-3 py-3">Nro. envío</th>
                      <th className="px-3 py-3">Cliente</th>
                      <th className="px-3 py-3">Dirección</th>
                      <th className="px-3 py-3">Localidad</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3 text-center">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          Cargando agenda...
                        </td>
                      </tr>
                    ) : agenda.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No hay entregas/retiros para hoy.
                        </td>
                      </tr>
                    ) : (
                      agenda.map((row) => (
                        <AgendaRow
                          key={row.id}
                          row={row}
                          actionLoading={actionLoading}
                          onRetirar={handleRetirar}
                          onEntregar={handleEntregar}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-blue-800">
              Estadísticas de actividad
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Ingresos totales"
                value={`$${stats.ingresosTotales.toLocaleString("es-AR")}`}
              />

              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Ingreso promedio por viaje"
                value={`$${stats.ingresoPromedioViaje.toLocaleString("es-AR", {
                  maximumFractionDigits: 0,
                })}`}
              />

              <StatCard
                icon={<Map className="h-5 w-5" />}
                label="Distancia promedio por viaje"
                value={`${stats.distanciaPromedioViaje.toLocaleString("es-AR", {
                  maximumFractionDigits: 1,
                })} km`}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card title="Días de más entregas">
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.diasMasEntregas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="entregas"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Entregas vs retiros">
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.comparativaEnvios}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tipo" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="cantidad"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div>
          <Card title="Ruta optimizada del día">
            {loadingRuta ? (
              <div className="h-[260px] grid place-items-center text-slate-400 bg-slate-100 rounded-xl text-sm">
                Calculando ruta optimizada...
              </div>
            ) : rutaError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {rutaError}
              </div>
            ) : !ruta ? (
              <div className="h-[260px] grid place-items-center text-slate-400 bg-slate-100 rounded-xl text-sm">
                Sin envíos para hoy
              </div>
            ) : (
              <MapaRutaOptimizada
                ruta={ruta}
                onCompletar={handleCompletar}
                onConfirmarRetiro={handleConfirmarRetiro}
                onRegenerar={() => cargarOGenerarRuta(true)}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AgendaRow({ row, actionLoading, onRetirar, onEntregar }) {
  const estadoKey = toEstadoKey(row.estado);
  const isLoading = (k) => actionLoading === `${row.id}_${k}`;
  const puedeRetirar = PUEDE_RETIRAR.includes(row.estado);
  const puedeEntregar = PUEDE_ENTREGAR.includes(row.estado);

  return (
    <tr className="border-t border-slate-100 text-sm hover:bg-slate-50">
      <td className="px-3 py-3 text-slate-500 font-semibold">{row.orden}</td>

      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <Link
            to={`/comisionista/envios/${row.id}/tracking`}
            className="font-bold text-blue-700 hover:underline text-xs"
          >
            #{row.numero}
          </Link>

          <span
            className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full w-fit ${
              row.tipo === "RETIRO"
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {row.tipo === "RETIRO" ? "Retiro" : "Entrega"}
          </span>
        </div>
      </td>

      <td className="px-3 py-3 text-slate-700 max-w-[120px] truncate">
        {row.cliente}
      </td>

      <td className="px-3 py-3 text-slate-700 max-w-[160px]">
        <span className="line-clamp-2 text-xs">{row.destino}</span>
        {row.franja && (
          <span className="text-[10px] text-slate-400 block mt-0.5">
            🕐 {row.franja}
          </span>
        )}
      </td>

      <td className="px-3 py-3 text-slate-700 text-xs">{row.localidad}</td>

      <td className="px-3 py-3">
        <StatusBadge estado={estadoKey} label={estadoLabel(row.estado)} />
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center justify-center gap-1.5">
          {puedeRetirar && (
            <ActionBtn
              title="Marcar como retirado"
              loading={isLoading("retirar")}
              onClick={() => onRetirar(row.id)}
              colorCls="bg-violet-600 hover:bg-violet-700"
              icon={<PackageCheck className="h-3.5 w-3.5" />}
              label="Retirado"
            />
          )}

          {puedeEntregar && (
            <ActionBtn
              title="Marcar como entregado"
              loading={isLoading("entregar")}
              onClick={() => onEntregar(row.id)}
              colorCls="bg-emerald-600 hover:bg-emerald-700"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="Entregado"
            />
          )}

          {["ENTREGADO", "DEVUELTO", "CANCELADO"].includes(row.estado) && (
            <span className="text-xs text-slate-400 italic">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ title, loading, onClick, colorCls, icon, label }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-white ${colorCls} disabled:opacity-40 transition`}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

function QuickAction({ to, icon, title }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition p-4 flex items-center gap-3"
    >
      <div className="h-10 w-10 rounded-lg bg-slate-100 grid place-items-center text-slate-700">
        {icon}
      </div>
      <div className="font-bold text-slate-700">{title}</div>
    </Link>
  );
}

function Metric({ value, label }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="text-3xl font-extrabold text-blue-800 leading-none">
        {value}
      </div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <span className="text-blue-700">{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-extrabold text-blue-800">{value}</div>
    </div>
  );
}