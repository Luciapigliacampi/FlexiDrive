//flexidrive-front\src\pages\comisionista\DashboardComisionista.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  PackageCheck,
  PlayCircle,
  StopCircle,
  AlertCircle,
  X,
  DollarSign,
  TrendingUp,
  Map,
  Calendar,
  ChevronDown,
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
import { useToast } from "../../components/toast/useToast";
import { useConfirm } from "../../components/ConfirmDialog";
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

const IA_ROUTE_BASE =
  import.meta.env.VITE_IA_API_URL || "http://localhost:3002";
const CAL_BASE =
  import.meta.env.VITE_CALIFICACIONES_API_URL || "http://localhost:3003";

// ── Rangos de fecha predefinidos ───────────────────────────────────────────
const PRESET_RANGES = [
  { label: "Últimos 7 días", value: "7d" },
  { label: "Últimos 30 días", value: "30d" },
  { label: "Este mes", value: "this_month" },
  { label: "Mes anterior", value: "last_month" },
  { label: "Este año", value: "this_year" },
  { label: "Personalizado", value: "custom" },
];

function calcularRango(preset) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fmt = (d) => d.toISOString().slice(0, 10);

  switch (preset) {
    case "7d": {
      const desde = new Date(hoy);
      desde.setDate(desde.getDate() - 6);
      return { desde: fmt(desde), hasta: fmt(hoy) };
    }
    case "30d": {
      const desde = new Date(hoy);
      desde.setDate(desde.getDate() - 29);
      return { desde: fmt(desde), hasta: fmt(hoy) };
    }
    case "this_month": {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      return { desde: fmt(desde), hasta: fmt(hasta) };
    }
    case "last_month": {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return { desde: fmt(desde), hasta: fmt(hasta) };
    }
    case "this_year": {
      const desde = new Date(hoy.getFullYear(), 0, 1);
      const hasta = new Date(hoy.getFullYear(), 11, 31);
      return { desde: fmt(desde), hasta: fmt(hasta) };
    }
    default:
      return null;
  }
}

export default function DashboardComisionista() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const username = localStorage.getItem("username") || "Usuario";

  const userRaw = localStorage.getItem("user");
  const userId = useMemo(() => {
    try {
      return userRaw ? JSON.parse(userRaw)?.id : null;
    } catch {
      return null;
    }
  }, [userRaw]);

  const [loading, setLoading] = useState(true);
  const [loadingRuta, setLoadingRuta] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [rutaError, setRutaError] = useState("");

  const [resumen, setResumen] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [ruta, setRuta] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [calificacion, setCalificacion] = useState(null);

  // ── Filtros de estadísticas ───────────────────────────────────────────────
  const [statsPreset, setStatsPreset] = useState("30d");
  const [statsDesde, setStatsDesde] = useState(() => calcularRango("30d").desde);
  const [statsHasta, setStatsHasta] = useState(() => calcularRango("30d").hasta);
  const [showFiltroStats, setShowFiltroStats] = useState(false);
  const [customDesde, setCustomDesde] = useState("");
  const [customHasta, setCustomHasta] = useState("");
  const filtroStatsRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (filtroStatsRef.current && !filtroStatsRef.current.contains(e.target)) {
        setShowFiltroStats(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const aplicarPreset = useCallback((preset) => {
    setStatsPreset(preset);
    if (preset !== "custom") {
      const rango = calcularRango(preset);
      if (rango) {
        setStatsDesde(rango.desde);
        setStatsHasta(rango.hasta);
      }
      setShowFiltroStats(false);
    }
  }, []);

  const aplicarPersonalizado = useCallback(() => {
    if (!customDesde || !customHasta) return;
    if (customDesde > customHasta) {
      toast.error("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }
    setStatsDesde(customDesde);
    setStatsHasta(customHasta);
    setShowFiltroStats(false);
  }, [customDesde, customHasta, toast]);

  const labelRangoActivo = useMemo(() => {
    if (statsPreset !== "custom") {
      return PRESET_RANGES.find((r) => r.value === statsPreset)?.label ?? "Filtrar";
    }
    if (statsDesde && statsHasta) {
      return `${statsDesde} → ${statsHasta}`;
    }
    return "Personalizado";
  }, [statsPreset, statsDesde, statsHasta]);

  // ── Viaje state ───────────────────────────────────────────────────────────
  const [viajeIniciado, setViajeIniciado] = useState(() => {
    const uid = (() => {
      try {
        return JSON.parse(localStorage.getItem("user"))?.id || "";
      } catch {
        return "";
      }
    })();
    return sessionStorage.getItem(`viaje_iniciado_${uid}`) === "true";
  });

  const viajeIniciadoRef = useRef(viajeIniciado);

  const setViajeIniciadoPersist = useCallback((val) => {
    const uid = (() => {
      try {
        return JSON.parse(localStorage.getItem("user"))?.id || "";
      } catch {
        return "";
      }
    })();

    if (val) {
      sessionStorage.setItem(`viaje_iniciado_${uid}`, "true");
    } else {
      sessionStorage.removeItem(`viaje_iniciado_${uid}`);
    }

    viajeIniciadoRef.current = val;
    setViajeIniciado(val);
  }, []);

  const [ubicacionPartida, setUbicacionPartida] = useState(null);
  const [fechaHoy, setFechaHoy] = useState(() => getTodayString());

  const handleUbicacionChange = useCallback((coords) => {
    setUbicacionPartida(coords);
  }, []);

  // ── Agenda ────────────────────────────────────────────────────────────────
  const cargarAgenda = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [r1, r2] = await Promise.all([
        getDashboardResumen({ date: fechaHoy }),
        getAgendaHoy({ date: fechaHoy }),
      ]);

      setResumen(r1);
      setAgenda(Array.isArray(r2?.items ?? r2) ? r2?.items ?? r2 : []);
    } catch (e) {
      setError(e?.message || "No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [fechaHoy]);

  const cargarEstadisticas = useCallback(async () => {
    if (!userId) return;

    setLoadingStats(true);
    try {
      const [dataStats, dataCal] = await Promise.all([
        getEstadisticasComisionista(userId, { desde: statsDesde, hasta: statsHasta }),
        api
          .get(`${CAL_BASE}/api/calificaciones/${userId}`)
          .then((r) => r.data)
          .catch(() => null),
      ]);

      setEstadisticas(dataStats || null);
      setCalificacion(dataCal || null);
    } catch (e) {
      console.error("No se pudieron cargar las estadísticas", e);
      setEstadisticas(null);
      setCalificacion(null);
    } finally {
      setLoadingStats(false);
    }
  }, [userId, statsDesde, statsHasta]);

  useEffect(() => {
    cargarAgenda();
  }, [cargarAgenda]);

  useEffect(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  // ── Ruta ──────────────────────────────────────────────────────────────────
  const cargarOGenerarRuta = useCallback(
    async (forceRegenerate = false, coordenadas = null, syncViaje = false) => {
      if (!userId) return;

      setLoadingRuta(true);
      setRutaError("");

      try {
        if (!forceRegenerate) {
          try {
            const rutaActiva = await getRutaActiva({ comisionistaId: userId });
            setRuta(rutaActiva ?? null);

            if (syncViaje) {
              setViajeIniciadoPersist(rutaActiva?.viaje_iniciado === true);
            }
          } catch (e) {
            if (e?.response?.status === 404) {
              setRuta(null);

              if (syncViaje) {
                try {
                  const agendaActual = await getAgendaHoy({ date: fechaHoy });
                  const items = Array.isArray(agendaActual?.items ?? agendaActual)
                    ? agendaActual?.items ?? agendaActual
                    : [];

                  const hayEnRuta = items.some((item) =>
                    [
                      "EN_CAMINO",
                      "DEMORADO_ENTREGA",
                      "EN_RETIRO",
                      "RETIRADO",
                    ].includes(item.estado)
                  );

                  if (!hayEnRuta) setViajeIniciadoPersist(false);
                } catch {
                  setViajeIniciadoPersist(false);
                }
              }
            } else {
              throw e;
            }
          }

          return;
        }

        let posActual = coordenadas;

        if (!posActual && navigator.geolocation) {
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
      } catch (e) {
        if (e?.response?.status === 404 || e?.response?.status === 500) {
          setRuta(null);
        } else {
          setRutaError(e?.message || "No se pudo generar la ruta.");
        }
      } finally {
        setLoadingRuta(false);
      }
    },
    [userId, fechaHoy, setViajeIniciadoPersist]
  );

  useEffect(() => {
    cargarOGenerarRuta(false, null, true);
  }, [cargarOGenerarRuta]);

  // ── Test date ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function onTestDateChanged(e) {
      const nuevaFecha = e?.detail?.TEST_DATE;

      if (nuevaFecha) setFechaHoy(nuevaFecha);
      else setFechaHoy(getTodayString());

      cargarAgenda();
      cargarOGenerarRuta(true);
    }

    window.addEventListener("test-date-changed", onTestDateChanged);
    return () =>
      window.removeEventListener("test-date-changed", onTestDateChanged);
  }, [cargarAgenda, cargarOGenerarRuta]);

  // ── Recargar ruta sin regenerar ───────────────────────────────────────────
  const recargarRuta = useCallback(async () => {
    try {
      const rutaActiva = await getRutaActiva({ comisionistaId: userId });
      setRuta(rutaActiva);
    } catch (e) {
      if (e?.response?.status === 404) setRuta(null);
    }
  }, [userId]);

  // ── Auto-finalizar cuando se completan todas las paradas ──────────────────
  const handleViajeCompletado = useCallback(async () => {
    setRuta(null);
    setViajeIniciadoPersist(false);
    await cargarAgenda();
    await cargarEstadisticas();
    toast.success("¡Todas las paradas completadas! Viaje finalizado.");
  }, [cargarAgenda, cargarEstadisticas, setViajeIniciadoPersist, toast]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const withLoading = useCallback(
    async (key, fn) => {
      setActionLoading(key);
      setActionError("");

      try {
        await fn();
        await cargarAgenda();
        await recargarRuta();
        await cargarEstadisticas();
      } catch (e) {
        const msg =
          e?.response?.data?.message || e?.message || "Error al actualizar.";
        setActionError(msg);
        toast.error(msg);
      } finally {
        setActionLoading(null);
      }
    },
    [cargarAgenda, recargarRuta, cargarEstadisticas, toast]
  );

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleRetirar = useCallback(
    (id) => {
      confirm("¿Confirmar retiro de este paquete?", {
        labelConfirm: "Retirar",
        onConfirm: async () => {
          await withLoading(`${id}_retirar`, async () => {
            await marcarRetirado(id);

            const result = await completarParada({
              envioId: id,
              tipo: "RETIRO",
              comisionistaId: userId,
              fecha: fechaHoy,
            }).catch(() => null);

            if (result?.viajeCompletado) {
              await handleViajeCompletado();
            }

            toast.success("Paquete marcado como retirado.");
          });
        },
      });
    },
    [confirm, withLoading, userId, fechaHoy, handleViajeCompletado, toast]
  );

  const handleEntregar = useCallback(
    (id) => {
      confirm("¿Confirmar entrega de este paquete?", {
        labelConfirm: "Entregar",
        onConfirm: async () => {
          await withLoading(`${id}_entregar`, async () => {
            await marcarEntregado(id);

            const result = await completarParada({
              envioId: id,
              tipo: "ENTREGA",
              comisionistaId: userId,
              fecha: fechaHoy,
            }).catch(() => null);

            if (result?.viajeCompletado) {
              await handleViajeCompletado();
            }

            toast.success("Paquete marcado como entregado.");
          });
        },
      });
    },
    [confirm, withLoading, userId, fechaHoy, handleViajeCompletado, toast]
  );

  const handleIniciarViaje = useCallback(() => {
    confirm("¿Iniciar el viaje del día? Esto actualizará el estado de todos los envíos.", {
      labelConfirm: "Iniciar",
      onConfirm: async () => {
        await withLoading("iniciar_viaje", async () => {
          await iniciarViaje(fechaHoy);

          const nuevaRuta = await generarRutaHoy({
            comisionistaId: userId,
            fecha: fechaHoy,
            latActual: ubicacionPartida?.lat ?? null,
            lngActual: ubicacionPartida?.lng ?? null,
          });

          await api
            .patch(`${IA_ROUTE_BASE}/api/rutas/iniciar/${userId}`, {
              latInicio: ubicacionPartida?.lat ?? null,
              lngInicio: ubicacionPartida?.lng ?? null,
            })
            .catch(() => {});

          setRuta(nuevaRuta);
          setViajeIniciadoPersist(true);
          toast.success("Viaje iniciado correctamente.");
        });
      },
    });
  }, [
    confirm,
    withLoading,
    fechaHoy,
    userId,
    ubicacionPartida,
    setViajeIniciadoPersist,
    toast,
  ]);

  const handleFinalizarViaje = useCallback(() => {
    confirm("¿Finalizar el viaje del día? Los envíos pendientes quedarán como demorados.", {
      labelConfirm: "Finalizar",
      onConfirm: async () => {
        await withLoading("finalizar_viaje", async () => {
          await finalizarViaje(fechaHoy);
          setRuta(null);

          const [r1, r2] = await Promise.all([
            getDashboardResumen({ date: fechaHoy }),
            getAgendaHoy({ date: fechaHoy }),
          ]);

          setResumen(r1);

          const nuevaAgenda = Array.isArray(r2?.items ?? r2)
            ? r2?.items ?? r2
            : [];

          setAgenda(nuevaAgenda);

          const hayDemorados = nuevaAgenda.some((item) =>
            ["DEMORADO_RETIRO", "DEMORADO_ENTREGA"].includes(item.estado)
          );

          setViajeIniciadoPersist(false);

          if (hayDemorados) {
            toast.success(
              "Viaje finalizado. Los envíos pendientes quedaron como demorados."
            );
          } else {
            toast.success("Viaje finalizado correctamente.");
          }
        });
      },
    });
  }, [confirm, withLoading, fechaHoy, setViajeIniciadoPersist, toast]);

  const handleConfirmarRetiro = useCallback(
    async (envioId, fecha) => {
      await confirmarFechaRetiro({ envioId, fecha, comisionistaId: userId });
      toast.success("Fecha de retiro confirmada.");

      setRuta((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          orden_entregas: prev.orden_entregas.map((p) =>
            String(p.envioId) === String(envioId) && p.tipo === "RETIRO"
              ? { ...p, fecha_retiro_confirmada: `${fecha}T12:00:00.000Z` }
              : p
          ),
        };
      });
    },
    [userId, toast]
  );

  // ── Agenda ordenada según ruta optimizada ────────────────────────────────
  const agendaOrdenada = useMemo(() => {
    if (!ruta?.orden_entregas?.length || !agenda.length) return agenda;

    const rutaMap = {};
    for (const p of ruta.orden_entregas) {
      rutaMap[`${String(p.envioId)}_${p.tipo}`] = p;
    }

    const nCompletadas = ruta.orden_entregas.filter((p) => p.completada).length;

    const itemsConOrden = agenda.map((row) => {
      const clave = `${String(row.id)}_${row.tipo}`;
      const paradaRuta = rutaMap[clave];

      if (!paradaRuta) {
        return { ...row, _ordenRuta: 999, _completada: false };
      }

      return {
        ...row,
        _ordenRuta: paradaRuta.orden,
        _completada: paradaRuta.completada,
      };
    });

    itemsConOrden.sort((a, b) => a._ordenRuta - b._ordenRuta);

    let pendienteIdx = nCompletadas + 1;

    return itemsConOrden.map(({ _ordenRuta, _completada, ...row }) => ({
      ...row,
      orden: _completada ? _ordenRuta : pendienteIdx++,
    }));
  }, [agenda, ruta]);

  // ── Métricas ──────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const r = resumen || {};

    return [
      {
        value: loading ? "—" : String(r.enviosHoy ?? 0),
        label: "Envíos hoy",
      },
      {
        value: loading ? "—" : String(r.enRuta ?? 0),
        label: "En ruta",
      },
      {
        value: loading ? "—" : String(r.pendientesRetiro ?? 0),
        label: "Pendientes de retiro",
      },
      {
        value: loading
          ? "—"
          : calificacion?.promedio
          ? `${calificacion.promedio} ★`
          : "—",
        label: "Calificación",
      },
    ];
  }, [resumen, loading, calificacion]);

  const hayEnviosHoy = agenda.length > 0;

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
        : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => ({
            dia,
            entregas: 0,
          }));

    const comparativaEnvios =
      Array.isArray(estadisticas?.comparativaEnvios) &&
      estadisticas.comparativaEnvios.length > 0
        ? estadisticas.comparativaEnvios
        : [
            {
              tipo: "Entregas",
              cantidad: Number(estadisticas?.entregas || 0),
            },
            {
              tipo: "Retiros",
              cantidad: Number(estadisticas?.retiros || 0),
            },
          ];

    return {
      ingresosTotales,
      ingresoPromedioViaje,
      distanciaPromedioViaje,
      diasMasEntregas,
      comparativaEnvios,
    };
  }, [estadisticas]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-700">
            ¡Hola, {username}!
          </h1>
        </div>

        {viajeIniciado ? (
          <button
            type="button"
            onClick={handleFinalizarViaje}
            disabled={actionLoading === "finalizar_viaje"}
            className="flex items-center gap-2 rounded-md bg-slate-700 px-5 py-2 text-sm font-extrabold text-white shadow hover:bg-slate-800 disabled:opacity-50"
          >
            <StopCircle className="h-5 w-5" />
            {actionLoading === "finalizar_viaje"
              ? "Finalizando..."
              : "Finalizar viaje"}
          </button>
        ) : hayEnviosHoy ? (
          <button
            type="button"
            onClick={handleIniciarViaje}
            disabled={actionLoading === "iniciar_viaje"}
            className="flex items-center gap-2 rounded-md bg-blue-700 px-5 py-2 text-sm font-extrabold text-white shadow hover:bg-blue-800 disabled:opacity-50"
          >
            <PlayCircle className="h-5 w-5" />
            {actionLoading === "iniciar_viaje"
              ? "Iniciando..."
              : "Iniciar viaje del día"}
          </button>
        ) : null}
      </div>

      {(error || actionError) && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 gap-y-4 p-4 md:grid-cols-4 md:divide-x md:divide-slate-200">
          {metrics.map((m) => (
            <Metric key={m.label} value={m.value} label={m.label} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {/* COLUMNA IZQUIERDA: agenda + estadísticas */}
        <div className="space-y-4 lg:col-span-2">
          <div>
            <h2 className="mb-2 text-xl font-bold text-blue-800">
              Entregas y retiros programados para hoy
            </h2>

            <div className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="max-h-[220px] overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr className="text-xs font-bold uppercase tracking-wide">
                        <th className="w-10 px-3 py-2">#</th>
                        <th className="px-3 py-2">Nro. envío</th>
                        <th className="px-3 py-2">Cliente</th>
                        <th className="px-3 py-2">Dirección</th>
                        <th className="px-3 py-2">Localidad</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2 text-center">Acción</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-2 text-center text-slate-500"
                          >
                            Cargando agenda...
                          </td>
                        </tr>
                      ) : agenda.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-2 text-center text-slate-500"
                          >
                            No hay entregas/retiros para hoy.
                          </td>
                        </tr>
                      ) : (
                        agendaOrdenada.map((row) => (
                          <AgendaRow
                            key={`${row.id}_${row.tipo}`}
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
          </div>

          {/* Estadísticas debajo de agenda */}
          <div className="space-y-4">
            {/* Header de estadísticas con filtro */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-blue-800">
                Estadísticas de actividad
              </h2>

              {/* Selector de rango */}
              <div className="relative" ref={filtroStatsRef}>
                <button
                  type="button"
                  onClick={() => setShowFiltroStats((v) => !v)}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-blue-300 transition-colors"
                >
                  <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="max-w-[180px] truncate">{labelRangoActivo}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                      showFiltroStats ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showFiltroStats && (
                  <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
                    {/* Presets */}
                    <div className="p-1.5">
                      {PRESET_RANGES.filter((r) => r.value !== "custom").map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => aplicarPreset(r.value)}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                            statsPreset === r.value && statsPreset !== "custom"
                              ? "bg-blue-50 font-semibold text-blue-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>

                    {/* Divisor + rango personalizado */}
                    <div className="border-t border-slate-100 p-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Rango personalizado
                      </p>
                      <div className="space-y-2">
                        <div>
                          <label className="mb-0.5 block text-xs text-slate-500">
                            Desde
                          </label>
                          <input
                            type="date"
                            value={customDesde}
                            max={customHasta || undefined}
                            onChange={(e) => {
                              setCustomDesde(e.target.value);
                              setStatsPreset("custom");
                            }}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs text-slate-500">
                            Hasta
                          </label>
                          <input
                            type="date"
                            value={customHasta}
                            min={customDesde || undefined}
                            onChange={(e) => {
                              setCustomHasta(e.target.value);
                              setStatsPreset("custom");
                            }}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={aplicarPersonalizado}
                          disabled={!customDesde || !customHasta}
                          className="w-full rounded-md bg-blue-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Badge con rango activo */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span>
                Mostrando datos del{" "}
                <span className="font-semibold text-slate-700">
                  {statsDesde}
                </span>{" "}
                al{" "}
                <span className="font-semibold text-slate-700">
                  {statsHasta}
                </span>
              </span>
              {loadingStats && (
                <span className="ml-1 flex items-center gap-1 text-blue-500">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                  Actualizando...
                </span>
              )}
            </div>

            <div className={`grid grid-cols-1 gap-4 md:grid-cols-3 transition-opacity ${loadingStats ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
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
                value={`${stats.distanciaPromedioViaje.toLocaleString(
                  "es-AR",
                  {
                    maximumFractionDigits: 1,
                  }
                )} km`}
              />
            </div>

            <div className={`grid grid-cols-1 gap-6 xl:grid-cols-2 transition-opacity ${loadingStats ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
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

        {/* Mapa ruta */}
        <div>
          <Card title="Ruta optimizada del día">
            {loadingRuta ? (
              <div className="grid h-[260px] place-items-center rounded-md bg-slate-100 text-sm text-slate-400">
                Calculando ruta optimizada...
              </div>
            ) : rutaError ? (
              <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {rutaError}
              </div>
            ) : !ruta ? (
              <div className="grid h-[260px] place-items-center rounded-md bg-slate-100 text-sm text-slate-400">
                Sin envíos para hoy
              </div>
            ) : (
              <MapaRutaOptimizada
                ruta={ruta}
                onConfirmarRetiro={handleConfirmarRetiro}
                onRegenerar={(coords) => cargarOGenerarRuta(true, coords)}
                onUbicacionChange={handleUbicacionChange}
                viajeIniciado={viajeIniciado}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────

function AgendaRow({ row, actionLoading, onRetirar, onEntregar }) {
  const estadoKey = toEstadoKey(row.estado);
  const isLoading = (k) => actionLoading === `${row.id}_${k}`;

  const puedeRetirar = ["ASIGNADO", "EN_RETIRO", "DEMORADO_RETIRO"].includes(
    row.estado
  );
  const puedeEntregar = ["RETIRADO", "EN_CAMINO", "DEMORADO_ENTREGA"].includes(
    row.estado
  );

  return (
    <tr className="border-t border-slate-100 text-sm hover:bg-slate-50">
      <td className="px-3 py-2 font-semibold text-slate-500">{row.orden}</td>

      <td className="px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <Link
            to={`/comisionista/envios/${row.id}/tracking`}
            className="font-bold text-blue-700 hover:underline"
          >
            #{row.numero}
          </Link>

          <span
            className={`inline-block w-fit rounded-full px-1.5 py-0.5 font-bold uppercase ${
              row.tipo === "RETIRO"
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {row.tipo === "RETIRO" ? "Retiro" : "Entrega"}
          </span>
        </div>
      </td>

      <td className="max-w-[120px] truncate px-3 py-2 text-slate-700">
        {row.cliente}
      </td>

      <td className="max-w-[160px] px-3 py-3 text-slate-700">
        <span className="line-clamp-2 text-xs">{row.destino}</span>
        {row.franja && (
          <span className="mt-0.5 block text-[10px] text-slate-400">
            🕐 {row.franja}
          </span>
        )}
      </td>

      <td className="px-3 py-2 text-xs text-slate-700">{row.localidad}</td>

      <td className="px-3 py-2">
        <StatusBadge estado={estadoKey} label={estadoLabel(row.estado)} />
      </td>

      <td className="px-3 py-2">
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
            <span className="italic text-slate-400">—</span>
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
      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-white transition disabled:opacity-40 ${colorCls}`}
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

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <span className="text-blue-700">{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-extrabold text-blue-800">{value}</div>
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="leading-none text-3xl font-extrabold text-blue-800">
        {value}
      </div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
    </div>
  );
}
