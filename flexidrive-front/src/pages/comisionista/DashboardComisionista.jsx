// flexidrive-front/src/pages/comisionista/DashboardComisionista.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package, ClipboardList, Route, CheckCircle2,
  PackageCheck, PlayCircle, StopCircle, AlertCircle, X,
} from "lucide-react";
import { toEstadoKey, estadoLabel } from "../../utils/estadoUtils";
import { Card } from "../../components/UI";
import { useToast } from "../../components/toast/useToast";
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
} from "../../services/comisionistaServices";

import {
  marcarRetirado,
  marcarEntregado,
  iniciarViaje,
  finalizarViaje,
} from "../../services/shipmentServices";

import api from "../../services/api";

const IA_ROUTE_BASE = import.meta.env.VITE_IA_API_URL || "http://localhost:3002";

export default function DashboardComisionista() {
  const { toast } = useToast();

  const username = localStorage.getItem("username") || "Usuario";
  const userRaw = localStorage.getItem("user");
  const userId = userRaw ? JSON.parse(userRaw)?.id : null;

  const [loading,        setLoading]        = useState(true);
  const [loadingRuta,    setLoadingRuta]     = useState(true);
  const [actionLoading,  setActionLoading]   = useState(null);
  const [error,          setError]           = useState("");
  const [actionError,    setActionError]     = useState("");
  const [rutaError,      setRutaError]       = useState("");

  const [resumen,        setResumen]         = useState(null);
  const [agenda,         setAgenda]          = useState([]);
  const [ruta,           setRuta]            = useState(null);
  const [viajeIniciado,  setViajeIniciado]   = useState(() => {
    // Persistir entre recargas y cambios de fecha simulada
    const uid = (() => { try { return JSON.parse(localStorage.getItem("user"))?.id || ""; } catch { return ""; } })();
    return sessionStorage.getItem(`viaje_iniciado_${uid}`) === "true";
  });

  // Sincronizar viajeIniciado con sessionStorage para sobrevivir recargas
  const setViajeIniciadoPersist = useCallback((val) => {
    const uid = (() => { try { return JSON.parse(localStorage.getItem("user"))?.id || ""; } catch { return ""; } })();
    if (val) sessionStorage.setItem(`viaje_iniciado_${uid}`, "true");
    else sessionStorage.removeItem(`viaje_iniciado_${uid}`);
    setViajeIniciado(val);
  }, []);
  const [ubicacionPartida, setUbicacionPartida] = useState(null); // { lat, lng }

  const [fechaHoy, setFechaHoy] = useState(() => getTodayString());

  // ── Callback estable para el mapa ──────────────────────────────────────────
  const handleUbicacionChange = useCallback((coords) => {
    setUbicacionPartida(coords);
  }, []);

  // ── Agenda ─────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    cargarAgenda();
  }, [cargarAgenda]);

  // ── Ruta ───────────────────────────────────────────────────────────────────
  const cargarOGenerarRuta = useCallback(async (forceRegenerate = false, coordenadas = null) => {
    if (!userId) return;
    setLoadingRuta(true);
    setRutaError("");

    // Leer estado de viaje ANTES del try para tenerlo disponible en catch
    let viajeYaIniciado = false;
    let rutaActivaExistente = null;

    try {
      // Consultar estado real de la ruta activa
      try {
        rutaActivaExistente = await getRutaActiva({ comisionistaId: userId });
        viajeYaIniciado = rutaActivaExistente?.viaje_iniciado === true;
      } catch (e) {
        if (e?.response?.status !== 404) throw e;
        // 404: no hay ruta activa, pero puede haber envíos demorados pendientes
      }

      // Si no forzamos regenerar y el viaje no está iniciado → mostrar ruta tal cual
      if (!forceRegenerate && !viajeYaIniciado) {
        setRuta(rutaActivaExistente ?? null);
        setViajeIniciadoPersist(false);
        return;
      }

      // Si hay viaje iniciado o forceRegenerate → regenerar

      // Si vienen coordenadas desde el mapa, usarlas directo.
      // Si no, intentar GPS como fallback.
      let posActual = coordenadas;
      if (!posActual && navigator.geolocation) {
        posActual = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
      setViajeIniciadoPersist(nuevaRuta?.viaje_iniciado === true || viajeYaIniciado);
    } catch (e) {
      if (e?.response?.status === 404 || e?.response?.status === 500) {
        setRuta(null);
        // Preservar viajeIniciado si ya estaba activo (ej: viaje con solo demorados)
        if (!viajeYaIniciado) setViajeIniciadoPersist(false);
      } else {
        setRutaError(e?.message || "No se pudo generar la ruta.");
      }
    } finally {
      setLoadingRuta(false);
    }
  }, [userId, fechaHoy]);

  useEffect(() => {
    cargarOGenerarRuta();
  }, [cargarOGenerarRuta]);

  // ── Re-optimizar automáticamente cuando se hidrata viajeIniciado ───────────
  // El GPS del mapa corre antes de que la ruta cargue, entonces cuando
  // viajeIniciado pasa a true ya tenemos ubicacionPartida disponible.
  useEffect(() => {
    if (!viajeIniciado) return;
    if (!ubicacionPartida) return;
    if (!ruta) return;
    cargarOGenerarRuta(true, ubicacionPartida);
  // Solo disparar cuando viajeIniciado cambia a true, no en cada render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viajeIniciado]);

  // ── Test date ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function onTestDateChanged(e) {
      const nuevaFecha = e?.detail?.TEST_DATE;
      if (nuevaFecha) setFechaHoy(nuevaFecha);
      else setFechaHoy(getTodayString());
      cargarAgenda();
      cargarOGenerarRuta(true);
    }
    window.addEventListener("test-date-changed", onTestDateChanged);
    return () => window.removeEventListener("test-date-changed", onTestDateChanged);
  }, [cargarAgenda, cargarOGenerarRuta]);

  // ── Recargar ruta sin regenerar ────────────────────────────────────────────
  const recargarRuta = useCallback(async () => {
    try {
      const rutaActiva = await getRutaActiva({ comisionistaId: userId });
      setRuta(rutaActiva);
      setViajeIniciadoPersist(rutaActiva?.viaje_iniciado === true);
    } catch (e) {
      if (e?.response?.status === 404) {
        setRuta(null);
        setViajeIniciadoPersist(false);
      }
    }
  }, [userId]);

  // ── Auto-finalizar cuando se completan todas las paradas ───────────────────
  const handleViajeCompletado = useCallback(async () => {
    setRuta(null);
    setViajeIniciadoPersist(false);
    await cargarAgenda();
    toast.success("¡Todas las paradas completadas! Viaje finalizado.");
  }, [cargarAgenda, toast]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const withLoading = useCallback(async (key, fn) => {
    setActionLoading(key);
    setActionError("");
    try {
      await fn();
      await cargarAgenda();
      await recargarRuta();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Error al actualizar.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  }, [cargarAgenda, recargarRuta, toast]);

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handleRetirar = useCallback(
    (id) => withLoading(`${id}_retirar`, async () => {
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
    }),
    [withLoading, userId, fechaHoy, toast, handleViajeCompletado]
  );

  const handleEntregar = useCallback(
    (id) => {
      toast.confirm("¿Confirmar entrega de este paquete?", {
        label: "Entregar",
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
    [withLoading, userId, fechaHoy, toast, handleViajeCompletado]
  );

  const handleIniciarViaje = useCallback(() => {
    toast.confirm("¿Iniciar el viaje del día? Esto actualizará el estado de todos los envíos.", {
      label: "Iniciar",
      onConfirm: async () => {
        await withLoading("iniciar_viaje", async () => {
          // 1. Cambiar estados de envíos a EN_RETIRO
          await iniciarViaje(fechaHoy);
          // 2. Generar ruta AHORA que los envíos están en EN_RETIRO,
          //    usando el punto de partida seleccionado por el comisionista
          const nuevaRuta = await generarRutaHoy({
            comisionistaId: userId,
            fecha: fechaHoy,
            latActual: ubicacionPartida?.lat ?? null,
            lngActual: ubicacionPartida?.lng ?? null,
          });
          // 3. Marcar la ruta como viaje_iniciado en MongoDB
          await api.patch(`${IA_ROUTE_BASE}/api/rutas/iniciar/${userId}`, {
            latInicio: ubicacionPartida?.lat ?? null,
            lngInicio: ubicacionPartida?.lng ?? null,
          }).catch(() => {});
          setRuta(nuevaRuta);
          setViajeIniciadoPersist(true);
          toast.success("Viaje iniciado correctamente.");
        });
      },
    });
  }, [withLoading, fechaHoy, userId, ubicacionPartida, toast]);

  const handleFinalizarViaje = useCallback(() => {
    toast.confirm("¿Finalizar el viaje del día? Los envíos pendientes quedarán como demorados.", {
      label: "Finalizar",
      onConfirm: async () => {
        await withLoading("finalizar_viaje", async () => {
          await finalizarViaje(fechaHoy);
          setViajeIniciadoPersist(false);
          setRuta(null);
          toast.success("Viaje finalizado. Los envíos pendientes quedaron como demorados.");
        });
      },
    });
  }, [withLoading, fechaHoy, toast]);

  const handleConfirmarRetiro = useCallback(async (envioId, fecha) => {
    await confirmarFechaRetiro({ envioId, fecha, comisionistaId: userId });
    toast.success("Fecha de retiro confirmada.");
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
  }, [userId, toast]);

  // ── Agenda ordenada según ruta optimizada ─────────────────────────────────
  // Ordena la grilla según orden_entregas del mapa.
  // Completadas conservan su número original; pendientes se reindexan desde
  // completadas.length + 1, coincidiendo exactamente con los números del mapa.
  const agendaOrdenada = useMemo(() => {
    if (!ruta?.orden_entregas?.length || !agenda.length) return agenda;

    // "envioId_TIPO" → parada de la ruta
    const rutaMap = {};
    for (const p of ruta.orden_entregas) {
      rutaMap[`${String(p.envioId)}_${p.tipo}`] = p;
    }

    const nCompletadas = ruta.orden_entregas.filter(p => p.completada).length;

    const itemsConOrden = agenda.map(row => {
      const clave = `${String(row.id)}_${row.tipo}`;
      const paradaRuta = rutaMap[clave];
      if (!paradaRuta) return { ...row, _ordenRuta: 999, _completada: false };
      return { ...row, _ordenRuta: paradaRuta.orden, _completada: paradaRuta.completada };
    });

    itemsConOrden.sort((a, b) => a._ordenRuta - b._ordenRuta);

    // Completadas conservan su número; pendientes arrancan desde nCompletadas+1
    let pendienteIdx = nCompletadas + 1;
    return itemsConOrden.map(({ _ordenRuta, _completada, ...row }) => ({
      ...row,
      orden: _completada ? _ordenRuta : pendienteIdx++,
    }));
  }, [agenda, ruta]);

  // ── Métricas ───────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const r = resumen || {};
    return [
      { value: loading ? "—" : String(r.enviosHoy ?? 0),       label: "Envíos hoy" },
      { value: loading ? "—" : String(r.enRuta ?? 0),           label: "En ruta" },
      { value: loading ? "—" : String(r.pendientesRetiro ?? 0), label: "Pendientes de retiro" },
      { value: loading ? "—" : String(r.calificacion ?? "—"),   label: "Calificación" },
    ];
  }, [resumen, loading]);

  const hayEnviosHoy = agenda.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-700">
            Hola, {username}
          </h1>
          <p className="mt-2 text-xl font-semibold text-slate-600">¿Qué querés hacer hoy?</p>
        </div>

        {hayEnviosHoy && (
          viajeIniciado ? (
            <button
              type="button"
              onClick={handleFinalizarViaje}
              disabled={actionLoading === "finalizar_viaje"}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-50 shadow"
            >
              <StopCircle className="h-5 w-5" />
              {actionLoading === "finalizar_viaje" ? "Finalizando..." : "Finalizar viaje"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleIniciarViaje}
              disabled={actionLoading === "iniciar_viaje"}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-800 disabled:opacity-50 shadow"
            >
              <PlayCircle className="h-5 w-5" />
              {actionLoading === "iniciar_viaje" ? "Iniciando..." : "Iniciar viaje del día"}
            </button>
          )
        )}
      </div>

      {(error || actionError) && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error || actionError}</span>
          <button className="ml-auto" onClick={() => { setError(""); setActionError(""); }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickAction to="/comisionista/crear-envio" icon={<Package className="h-6 w-6" />}      title="Crear envío" />
        <QuickAction to="/comisionista/envios"      icon={<ClipboardList className="h-6 w-6" />} title="Ver envíos" />
        <QuickAction to="/comisionista/rutas"       icon={<Route className="h-6 w-6" />}         title="Gestionar rutas" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 gap-y-4 md:grid-cols-4 md:divide-x md:divide-slate-200 p-4">
          {metrics.map((m) => <Metric key={m.label} value={m.value} label={m.label} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tabla agenda */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-blue-800 mb-3">
            Entregas y retiros programados para hoy
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600">
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
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Cargando agenda...</td></tr>
                  ) : agenda.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay entregas/retiros para hoy.</td></tr>
                  ) : (
                    agendaOrdenada.map((row) => (
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

        {/* Mapa ruta */}
        <div>
          <Card title="Ruta optimizada del día">
            {loadingRuta ? (
              <div className="h-[260px] grid place-items-center text-slate-400 bg-slate-100 rounded-xl text-sm">
                Calculando ruta optimizada...
              </div>
            ) : rutaError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{rutaError}</div>
            ) : !ruta ? (
              <div className="h-[260px] grid place-items-center text-slate-400 bg-slate-100 rounded-xl text-sm">
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

// ── Subcomponentes ─────────────────────────────────────────────────────────────

function AgendaRow({ row, actionLoading, onRetirar, onEntregar }) {
  const estadoKey   = toEstadoKey(row.estado);
  const isLoading   = (k) => actionLoading === `${row.id}_${k}`;
  const puedeRetirar  = ["ASIGNADO", "EN_RETIRO", "DEMORADO_RETIRO"].includes(row.estado);
  const puedeEntregar = ["RETIRADO", "EN_CAMINO", "DEMORADO_ENTREGA"].includes(row.estado);

  return (
    <tr className="border-t border-slate-100 text-sm hover:bg-slate-50">
      <td className="px-3 py-3 text-slate-500 font-semibold">{row.orden}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <Link to={`/comisionista/envios/${row.id}/tracking`} className="font-bold text-blue-700 hover:underline text-xs">
            #{row.numero}
          </Link>
          <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full w-fit ${
            row.tipo === "RETIRO" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
          }`}>
            {row.tipo === "RETIRO" ? "Retiro" : "Entrega"}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-slate-700 max-w-[120px] truncate">{row.cliente}</td>
      <td className="px-3 py-3 text-slate-700 max-w-[160px]">
        <span className="line-clamp-2 text-xs">{row.destino}</span>
        {row.franja && <span className="text-[10px] text-slate-400 block mt-0.5">🕐 {row.franja}</span>}
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
      {loading
        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        : icon
      }
      {label}
    </button>
  );
}

function QuickAction({ to, icon, title }) {
  return (
    <Link to={to} className="rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-slate-100 grid place-items-center text-slate-700">{icon}</div>
      <div className="font-bold text-slate-700">{title}</div>
    </Link>
  );
}

function Metric({ value, label }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="text-3xl font-extrabold text-blue-800 leading-none">{value}</div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
    </div>
  );
}
