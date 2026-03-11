// flexidrive-front/src/pages/cliente/TrackingEnvio.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  GoogleMap, Marker, Polyline, useJsApiLoader,
} from "@react-google-maps/api";
import Loader from "../../components/Loader";
import TrackingProgress from "../../components/TrackingProgress";
import StatusBadge from "../../components/StatusBadge";
import { Card, Button } from "../../components/UI";
import { getSeguimientoEnvio } from "../../services/mapsService";
import { Archive, Trash2, X as XIcon, AlertCircle, MoreVertical, CheckCircle2 } from "lucide-react";
import { useEnvioAcciones, puedeCancel, puedeArchivar, puedeEliminar, mensajeBloqueo } from "../../hooks/useShipments";
import { formatFechaEntrega } from "../../utils/fechas";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";
const POLL_INTERVAL_MS = 15000;

function decodePolyline(encoded) {
  if (!encoded) return [];
  let index = 0, lat = 0, lng = 0;
  const coordinates = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coordinates;
}

const MAP_CONTAINER = { width: "100%", height: "380px" };

const ESTADO_A_STEP = {
  PENDIENTE: "solicitado", ASIGNADO: "solicitado",
  EN_RETIRO: "en_retiro",  EN_CAMINO: "en_camino",
  ENTREGADO: "entregado",  CANCELADO: "solicitado",
  CANCELADO_RETORNO: "en_camino", DEMORADO: "en_camino",
};

const moneyARS = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n || 0));

export default function TrackingEnvio() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [map, setMap] = useState(null);
  const pollingRef = useRef(null);
  const [openActions, setOpenActions] = useState(false);
  const actionsRef = useRef(null);

  const { isLoaded: mapsLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY });

  const fetchSeguimiento = useCallback(async () => {
    try {
      const res = await getSeguimientoEnvio(id);
      setData(res);
      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Error al cargar el seguimiento");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const {
    actionLoading, actionError, setActionError, waLink, setWaLink,
    handleCancelar, handleArchivar, handleEliminar,
  } = useEnvioAcciones({ onSuccess: () => { fetchSeguimiento(); } });

  useEffect(() => {
    if (!openActions) return;
    const onMouseDown = (e) => { if (!actionsRef.current?.contains(e.target)) setOpenActions(false); };
    const onKeyDown = (e) => { if (e.key === "Escape") setOpenActions(false); };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", onMouseDown); document.removeEventListener("keydown", onKeyDown); };
  }, [openActions]);

  useEffect(() => {
    fetchSeguimiento();
    pollingRef.current = setInterval(fetchSeguimiento, POLL_INTERVAL_MS);
    return () => clearInterval(pollingRef.current);
  }, [fetchSeguimiento]);

  const onMapLoad = useCallback((mapInstance) => { setMap(mapInstance); }, []);

  useEffect(() => {
    if (!map || !data?.mapa) return;
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: data.mapa.lat_origen, lng: data.mapa.lng_origen });
    bounds.extend({ lat: data.mapa.lat_destino, lng: data.mapa.lng_destino });
    map.fitBounds(bounds, 60);
  }, [map, data]);

  if (loading) return <Loader label="Cargando seguimiento..." />;
  if (error) return (
    <div className="rounded-xl border bg-white p-6 text-red-600">
      {error}
      <div className="mt-4">
        <Link to="/cliente/envios" className="font-semibold text-blue-700 hover:underline">Volver al historial</Link>
      </div>
    </div>
  );
  if (!data) return null;

  const estado = (data.estado || "PENDIENTE").toUpperCase();
  const stepKey = ESTADO_A_STEP[estado] || "solicitado";
  const isEntregado = estado === "ENTREGADO";
  const isCancelado = estado === "CANCELADO";
  const isDemorado = data.es_demorado;
  const esRetorno = data.es_retorno;

  const polylinePath = decodePolyline(data.mapa?.polyline);
  const origenPos = { lat: data.mapa?.lat_origen, lng: data.mapa?.lng_origen };
  const destinoPos = { lat: data.mapa?.lat_destino, lng: data.mapa?.lng_destino };
  const mostrarPolyline = !["PENDIENTE", "ASIGNADO"].includes(estado) && polylinePath.length > 0;

  return (
    <div className="space-y-6 m-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-700">
            Envío #{data.nro_envio || id}
          </h1>
          <StatusBadge estado={estado.toLowerCase()} />
          {isDemorado && !isCancelado && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">⚠ Demorado</span>
          )}
        </div>

        {/* Acciones ⋮ */}
        <div className="relative" ref={actionsRef}>
          <button type="button" onClick={() => setOpenActions((v) => !v)}
            className={["h-10 w-10 transition flex items-center justify-center hover:bg-slate-50", openActions ? "ring-2 ring-blue-200" : ""].join(" ")}
            aria-haspopup="menu" aria-expanded={openActions} title="Acciones">
            <MoreVertical className="w-5 h-5 text-slate-700" />
          </button>

          {openActions && (
            <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border bg-white shadow-lg z-50">
              {actionError && (
                <div className="flex items-start gap-2 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1">{actionError}</span>
                  <button onClick={() => setActionError("")} type="button"><XIcon className="w-3 h-3" /></button>
                </div>
              )}
              {waLink && (
                <div className="bg-green-50 px-3 py-2 text-sm text-green-800">
                  Coordiná la devolución:{" "}
                  <a href={waLink} target="_blank" rel="noreferrer" className="font-semibold underline">WhatsApp comisionista</a>
                </div>
              )}
              <div className="py-2">
                {[
                  { label: "Cancelar envío", icon: <XIcon className="w-4 h-4" />, puede: puedeCancel(estado), fn: () => { handleCancelar(id, estado); setOpenActions(false); }, color: "text-red-600" },
                  { label: "Archivar envío", icon: <Archive className="w-4 h-4" />, puede: puedeArchivar(estado), fn: () => { handleArchivar(id, estado); setOpenActions(false); }, color: "text-amber-700" },
                  { label: "Eliminar del historial", icon: <Trash2 className="w-4 h-4" />, puede: puedeEliminar(estado), fn: () => { handleEliminar(id, estado); setOpenActions(false); }, color: "text-red-600" },
                ].map(({ label, icon, puede, fn, color }) => (
                  <button key={label} type="button" disabled={!puede || !!actionLoading}
                    title={!puede ? mensajeBloqueo(label.split(" ")[0].toLowerCase(), estado) : ""}
                    onClick={fn}
                    className={["w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition", puede ? `${color} hover:bg-slate-50` : "text-slate-300 cursor-not-allowed"].join(" ")}
                    role="menuitem">
                    {icon} {label}
                    {!puede && <span className="ml-auto text-xs text-slate-400">No disponible</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isCancelado && <Alert type="danger" title="Envío cancelado" desc="Este envío fue cancelado. Si necesitás ayuda, contactá soporte." />}
      {esRetorno && <Alert type="warn" title="En retorno" desc="El paquete está siendo devuelto al remitente." />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda */}
        <div className="space-y-6">
          <Card title="Detalles del envío">
            <Row label="Origen" value={data.detalles?.origen || "—"} />
            <Row label="Destino" value={data.detalles?.destino || "—"} />
            <Row label="Fecha entrega" value={formatFechaEntrega(data.fechas?.entrega_estimada)} />
            <Row label="Horario retiro" value={data.fechas?.franja_retiro || "—"} />
            <Row label="Retiro confirmado" value={
              data.fechas?.retiro_confirmado
                ? formatFechaEntrega(data.fechas.retiro_confirmado)
                : "Pendiente"
            } />
            <Row label="Bultos" value={data.detalles?.paquetes ?? "—"} />
            {data.detalles?.notas && <Row label="Notas" value={data.detalles.notas} />}
          </Card>

          <Card title="Comisionista">
            {data.comisionista ? (
              <>
                <div className="flex items-center gap-4">
                  <img src={data.comisionista.foto || "https://via.placeholder.com/64"} alt="comisionista"
                    className="h-16 w-16 rounded-full object-cover bg-slate-200" />
                  <div>
                    <div className="text-lg font-bold text-slate-800">{data.comisionista.nombreCompleto}</div>
                    {data.comisionista.telefono && <div className="text-sm text-slate-500">📞 {data.comisionista.telefono}</div>}
                  </div>
                </div>
                {!isCancelado && (
                  <div className="mt-4 flex gap-3">
                    <a href={`tel:${data.comisionista.telefono}`}
                      className="flex-1 rounded-full bg-blue-700 px-4 py-2 text-center font-semibold text-white hover:bg-blue-800">
                      Llamar
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">Aún no hay comisionista asignado. Te notificaremos cuando alguien acepte el envío.</p>
            )}
          </Card>

          {isEntregado && (
  <Card title="¿Cómo fue la experiencia?">
    {data.calificado ? (
      <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
        <CheckCircle2 className="h-4 w-4" />
        Ya calificaste este envío ✓
      </div>
    ) : (
      <>
        <p className="text-slate-600 mb-4">Calificá al comisionista para ayudar a la comunidad.</p>
        <Button onClick={() => navigate(`/cliente/envios/${id}/calificar`)} className="w-full">
          ★ Calificar comisionista
        </Button>
      </>
    )}
  </Card>
)}
        </div>

        {/* Columna derecha — Mapa */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border bg-white p-4">
            {mapsLoaded ? (
              <GoogleMap mapContainerStyle={MAP_CONTAINER} zoom={12} onLoad={onMapLoad}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}>
                <Marker position={origenPos}
                  label={{ text: "A", color: "white", fontWeight: "bold" }}
                  icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: "#16a34a", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }}
                  title={`Origen: ${data.detalles?.origen}`} />
                <Marker position={destinoPos}
                  label={{ text: "B", color: "white", fontWeight: "bold" }}
                  icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: "#dc2626", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }}
                  title={`Destino: ${data.detalles?.destino}`} />
                {mostrarPolyline && (
                  <Polyline path={polylinePath} options={{ strokeColor: "#2563eb", strokeOpacity: 0.85, strokeWeight: 5 }} />
                )}
              </GoogleMap>
            ) : (
              <div className="flex h-[380px] items-center justify-center rounded-xl bg-slate-100 text-slate-400">Cargando mapa...</div>
            )}
          </div>

          <div className="flex gap-6 text-sm text-slate-600 px-1">
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-green-600" /> Origen</span>
            <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-red-600" /> Destino</span>
            {mostrarPolyline && <span className="flex items-center gap-2"><span className="inline-block h-1 w-6 rounded bg-blue-600" /> Ruta</span>}
          </div>

          <TrackingProgress progreso={stepKey} />

          <div className="flex justify-end">
            <Link to="/cliente/envios" className="font-semibold text-blue-700 hover:underline">Volver a historial</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Alert({ type, title, desc }) {
  const cls = type === "danger" ? "border-red-200 bg-red-50 text-red-800" : "border-orange-200 bg-orange-50 text-orange-900";
  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <div className="font-bold">{title}</div>
      <div className="mt-1">{desc}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b pb-3 last:border-b-0 last:pb-0">
      <div className="shrink-0 text-slate-500">{label}:</div>
      <div className="text-right font-semibold text-slate-700">{value}</div>
    </div>
  );
}
