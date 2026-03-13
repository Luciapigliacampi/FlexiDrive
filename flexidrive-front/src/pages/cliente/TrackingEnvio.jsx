// flexidrive-front/src/pages/cliente/TrackingEnvio.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  ArrowLeft,
  MapPin,
  Package,
  Clock,
  AlertCircle,
  MoreVertical,
  X as XIcon,
  Archive,
  Trash2,
  CheckCircle2,
  CreditCard,
  Banknote,
  UserCircle2,
  Star,
  CheckCheck,
} from "lucide-react";

import Loader from "../../components/Loader";
import TrackingProgress from "../../components/TrackingProgress";
import StatusBadge from "../../components/StatusBadge";
import { Card, Button } from "../../components/UI";
import { getSeguimientoEnvio } from "../../services/mapsService";
import {
  useEnvioAcciones,
  puedeCancel,
  puedeArchivar,
  puedeEliminar,
  mensajeBloqueo,
} from "../../hooks/useShipments";
import { formatFechaEntrega } from "../../utils/fechas";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";
const POLL_INTERVAL_MS = 15000;
const MAP_CONTAINER = { width: "100%", height: "380px" };

function decodePolyline(encoded) {
  if (!encoded) return [];

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

function getStepKey(estado, data) {
  const estadoNormalizado = (estado || "PENDIENTE").toUpperCase();

  if (estadoNormalizado === "CANCELADO") return null;
  if (estadoNormalizado === "CANCELADO_RETORNO" || data?.es_retorno) {
    return "en_camino";
  }

  if (
    estadoNormalizado === "DEMORADO_RETIRO" ||
    estadoNormalizado === "EN_RETIRO" ||
    estadoNormalizado === "RETIRADO"
  ) {
    return "en_retiro";
  }

  if (
    estadoNormalizado === "DEMORADO_ENTREGA" ||
    estadoNormalizado === "DEMORADO" ||
    estadoNormalizado === "EN_CAMINO"
  ) {
    return "en_camino";
  }

  switch (estadoNormalizado) {
    case "PENDIENTE":
    case "ASIGNADO":
      return "solicitado";
    case "ENTREGADO":
      return "entregado";
    default:
      return "solicitado";
  }
}

function getPaymentLabel(data) {
  const metodo =
    data?.pago?.metodo ||
    data?.metodo_pago_cliente ||
    data?.detalles?.metodo_pago ||
    "";

  const confirmado = Boolean(data?.pago?.confirmado);

  const map = {
    efectivo: "Efectivo",
    efectivoOrigen: "Efectivo en origen",
    efectivoDestino: "Efectivo en destino",
    transferencia: "Transferencia",
  };

  if (!metodo && !confirmado) return "Pendiente";
  if (!metodo && confirmado) return "Pago confirmado";

  return confirmado
    ? `Pago confirmado · ${map[metodo] ?? metodo}`
    : `Pendiente · ${map[metodo] ?? metodo}`;
}

function getPaymentIcon(data) {
  const metodo =
    data?.pago?.metodo ||
    data?.metodo_pago_cliente ||
    data?.detalles?.metodo_pago ||
    "";

  if (metodo === "transferencia") return CreditCard;
  return Banknote;
}

export default function TrackingEnvio() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [map, setMap] = useState(null);
  const [openActions, setOpenActions] = useState(false);

  const pollingRef = useRef(null);
  const actionsRef = useRef(null);

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_KEY,
  });

  const fetchSeguimiento = useCallback(async () => {
    try {
      const res = await getSeguimientoEnvio(id);
      setData(res);
      setError("");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Error al cargar el seguimiento"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const {
    actionLoading,
    actionError,
    setActionError,
    waLink,
    setWaLink,
    handleCancelar,
    handleArchivar,
    handleEliminar,
  } = useEnvioAcciones({
    onSuccess: () => {
      fetchSeguimiento();
    },
  });

  useEffect(() => {
    fetchSeguimiento();
    pollingRef.current = setInterval(fetchSeguimiento, POLL_INTERVAL_MS);

    return () => clearInterval(pollingRef.current);
  }, [fetchSeguimiento]);

  useEffect(() => {
    if (!openActions) return;

    const onMouseDown = (e) => {
      if (!actionsRef.current?.contains(e.target)) setOpenActions(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpenActions(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openActions]);

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  useEffect(() => {
    if (!map || !data?.mapa) return;

    const hasOrigen =
      typeof data.mapa.lat_origen === "number" &&
      typeof data.mapa.lng_origen === "number";

    const hasDestino =
      typeof data.mapa.lat_destino === "number" &&
      typeof data.mapa.lng_destino === "number";

    if (!hasOrigen && !hasDestino) return;

    const bounds = new window.google.maps.LatLngBounds();

    if (hasOrigen) {
      bounds.extend({
        lat: data.mapa.lat_origen,
        lng: data.mapa.lng_origen,
      });
    }

    if (hasDestino) {
      bounds.extend({
        lat: data.mapa.lat_destino,
        lng: data.mapa.lng_destino,
      });
    }

    map.fitBounds(bounds, 60);
  }, [map, data]);

  if (loading) {
    return <Loader label="Cargando seguimiento..." />;
  }

  if (error && !data) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-red-700">
        <AlertCircle className="mx-auto mb-2 h-8 w-8" />
        {error}
        <div className="mt-4">
          <Link
            to="/cliente/envios"
            className="font-semibold text-blue-700 hover:underline"
          >
            Volver al historial
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const estado = (data.estado || "PENDIENTE").toUpperCase();
  const stepKey = getStepKey(estado, data);

  const isEntregado = estado === "ENTREGADO";
  const isCancelado = estado === "CANCELADO";
  const isDemorado =
    estado === "DEMORADO" ||
    estado === "DEMORADO_RETIRO" ||
    estado === "DEMORADO_ENTREGA" ||
    data?.es_demorado;

  const esRetorno =
    estado === "CANCELADO_RETORNO" || Boolean(data?.es_retorno);

  const polylinePath = decodePolyline(data?.mapa?.polyline);

  const origenPos =
    typeof data?.mapa?.lat_origen === "number" &&
    typeof data?.mapa?.lng_origen === "number"
      ? { lat: data.mapa.lat_origen, lng: data.mapa.lng_origen }
      : null;

  const destinoPos =
    typeof data?.mapa?.lat_destino === "number" &&
    typeof data?.mapa?.lng_destino === "number"
      ? { lat: data.mapa.lat_destino, lng: data.mapa.lng_destino }
      : null;

  const mostrarPolyline =
    !["PENDIENTE", "ASIGNADO"].includes(estado) && polylinePath.length > 0;

  const PaymentIcon = getPaymentIcon(data);

  return (
    <div className="m-6 space-y-6">
      <button
        type="button"
        onClick={() => navigate("/cliente/envios")}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Envío #{data.nro_envio || id}
          </h1>
          {data.createdAt && (
            <p className="text-sm text-slate-500 mt-0.5">
              Creado el{" "}
              {new Date(data.createdAt).toLocaleDateString("es-AR")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge estado={estado.toLowerCase()} />

          {isDemorado && !isCancelado && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
              ⚠ Demorado
            </span>
          )}

          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setOpenActions((v) => !v)}
              className={[
                "h-10 w-10 rounded-xl border border-slate-200 bg-white transition flex items-center justify-center hover:bg-slate-50",
                openActions ? "ring-2 ring-blue-200" : "",
              ].join(" ")}
              aria-haspopup="menu"
              aria-expanded={openActions}
              title="Acciones"
            >
              <MoreVertical className="w-5 h-5 text-slate-700" />
            </button>

            {openActions && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border bg-white shadow-lg z-50"
              >
                {actionError && (
                  <div className="flex items-start gap-2 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="flex-1">{actionError}</span>
                    <button onClick={() => setActionError("")} type="button">
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {waLink && (
                  <div className="bg-green-50 px-3 py-2 text-sm text-green-800">
                    Coordiná la devolución:{" "}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline"
                    >
                      WhatsApp comisionista
                    </a>
                  </div>
                )}

                <div className="py-2">
                  {[
                    {
                      label: "Cancelar envío",
                      icon: <XIcon className="w-4 h-4" />,
                      puede: puedeCancel(estado),
                      fn: () => {
                        handleCancelar(id, estado);
                        setOpenActions(false);
                      },
                      color: "text-red-600",
                    },
                    {
                      label: "Archivar envío",
                      icon: <Archive className="w-4 h-4" />,
                      puede: puedeArchivar(estado),
                      fn: () => {
                        handleArchivar(id, estado);
                        setOpenActions(false);
                      },
                      color: "text-amber-700",
                    },
                    {
                      label: "Eliminar del historial",
                      icon: <Trash2 className="w-4 h-4" />,
                      puede: puedeEliminar(estado),
                      fn: () => {
                        handleEliminar(id, estado);
                        setOpenActions(false);
                      },
                      color: "text-red-600",
                    },
                  ].map(({ label, icon, puede, fn, color }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={!puede || !!actionLoading}
                      title={
                        !puede
                          ? mensajeBloqueo(
                              label.split(" ")[0].toLowerCase(),
                              estado
                            )
                          : ""
                      }
                      onClick={fn}
                      className={[
                        "w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition",
                        puede
                          ? `${color} hover:bg-slate-50`
                          : "text-slate-300 cursor-not-allowed",
                      ].join(" ")}
                      role="menuitem"
                    >
                      {icon}
                      {label}
                      {!puede && (
                        <span className="ml-auto text-xs text-slate-400">
                          No disponible
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isCancelado && (
        <Banner
          type="danger"
          title="Envío cancelado"
          desc="Este envío fue cancelado. Si necesitás ayuda, contactá soporte."
        />
      )}

      {esRetorno && (
        <Banner
          type="warn"
          title="En retorno"
          desc="El paquete está siendo devuelto al remitente."
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-1">
          <ShipmentCard data={data} />

          <Card title="Detalles del envío">
            <div className="space-y-4">
              <InfoRow
                icon={<MapPin className="h-4 w-4 text-blue-600" />}
                label="Origen"
              >
                {data.detalles?.origen || "—"}
              </InfoRow>

              <InfoRow
                icon={<MapPin className="h-4 w-4 text-emerald-600" />}
                label="Destino"
              >
                {data.detalles?.destino || "—"}
              </InfoRow>

              <InfoRow
                icon={<Package className="h-4 w-4 text-slate-500" />}
                label="Paquetes"
              >
                {data.detalles?.paquetes ?? "—"}
              </InfoRow>

              <InfoRow
                icon={<Clock className="h-4 w-4 text-slate-500" />}
                label="Fecha de entrega"
              >
                {formatFechaEntrega(data.fechas?.entrega_estimada)}
              </InfoRow>

              <InfoRow
                icon={<Clock className="h-4 w-4 text-slate-500" />}
                label="Franja de retiro"
              >
                {data.fechas?.franja_retiro || "—"}
              </InfoRow>

              <InfoRow
                icon={<Clock className="h-4 w-4 text-violet-500" />}
                label="Fecha de retiro confirmada"
              >
                {data.fechas?.retiro_confirmado
                  ? formatFechaEntrega(data.fechas.retiro_confirmado)
                  : "Pendiente"}
              </InfoRow>

              <InfoRow
                icon={<PaymentIcon className="h-4 w-4 text-slate-500" />}
                label="Estado del pago"
              >
                {getPaymentLabel(data)}
              </InfoRow>

              {data.detalles?.notas && (
                <InfoRow
                  icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                  label="Notas"
                >
                  {data.detalles.notas}
                </InfoRow>
              )}
            </div>
          </Card>

          <Card title="Comisionista">
            {data.comisionista ? (
              <>
                <div className="flex items-center gap-4">
                  {data.comisionista.foto ? (
                    <img
                      src={data.comisionista.foto}
                      alt="comisionista"
                      className="h-16 w-16 rounded-full object-cover bg-slate-200"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                      <UserCircle2 className="h-10 w-10 text-slate-400" />
                    </div>
                  )}

                  <div>
                    <div className="text-lg font-bold text-slate-800">
                      {data.comisionista.nombreCompleto || "Comisionista asignado"}
                    </div>

                    {data.comisionista.telefono && (
                      <div className="text-sm text-slate-500">
                        📞 {data.comisionista.telefono}
                      </div>
                    )}
                  </div>
                </div>

                {/* {!isCancelado && data.comisionista.telefono && (
                  <div className="mt-4 flex gap-3">
                    <a
                      href={`tel:${data.comisionista.telefono}`}
                      className="flex-1 rounded-xl bg-blue-700 px-4 py-2 text-center font-semibold text-white hover:bg-blue-800"
                    >
                      Llamar
                    </a>
                  </div>
                )} */}
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Aún no hay comisionista asignado. Te notificaremos cuando alguien
                acepte el envío.
              </p>
            )}
          </Card>

          {isEntregado && (
            <Card title="Calificación">
              {data.calificado ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`text-xl ${
                          n <= (data.calificacion?.puntuacion ?? 0)
                            ? "text-yellow-500"
                            : "text-slate-200"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="ml-1 font-bold text-slate-700">
                      {data.calificacion?.puntuacion ?? 0}/5
                    </span>
                  </div>

                  {data.calificacion?.comentario && (
                    <p className="text-sm text-slate-600 italic">
                      "{data.calificacion.comentario}"
                    </p>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => navigate(`/cliente/envios/${id}/calificar`)}
                    className="w-full"
                  >
                    <Star className="mr-2 h-4 w-4" />
                    Modificar calificación
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Calificá al comisionista para ayudar a la comunidad.
                  </p>

                  <Button
                    onClick={() => navigate(`/cliente/envios/${id}/calificar`)}
                    className="w-full"
                  >
                    <Star className="mr-2 h-4 w-4" />
                    Calificar comisionista
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">
              Mapa del envío
            </h2>

            {mapsLoaded ? (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER}
                zoom={12}
                onLoad={onMapLoad}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: true,
                }}
              >
                {origenPos && (
                  <Marker
                    position={origenPos}
                    label={{ text: "A", color: "white", fontWeight: "bold" }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 14,
                      fillColor: "#16a34a",
                      fillOpacity: 1,
                      strokeColor: "#fff",
                      strokeWeight: 2,
                    }}
                    title={`Origen: ${data.detalles?.origen || "Origen"}`}
                  />
                )}

                {destinoPos && (
                  <Marker
                    position={destinoPos}
                    label={{ text: "B", color: "white", fontWeight: "bold" }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 14,
                      fillColor: "#dc2626",
                      fillOpacity: 1,
                      strokeColor: "#fff",
                      strokeWeight: 2,
                    }}
                    title={`Destino: ${data.detalles?.destino || "Destino"}`}
                  />
                )}

                {mostrarPolyline && (
                  <Polyline
                    path={polylinePath}
                    options={{
                      strokeColor: "#2563eb",
                      strokeOpacity: 0.85,
                      strokeWeight: 5,
                    }}
                  />
                )}
              </GoogleMap>
            ) : (
              <div className="flex h-[380px] items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                Cargando mapa...
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-600 px-1">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-green-600" />
                Origen
              </span>

              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
                Destino
              </span>

              {mostrarPolyline && (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-1 w-6 rounded bg-blue-600" />
                  Ruta
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">
              Progreso del envío
            </h2>

            {isCancelado ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Este envío fue cancelado y ya no tiene progreso activo.
              </div>
            ) : (
              <TrackingProgress progreso={stepKey} demorado={isDemorado} />
            )}
          </div>

          <div className="flex justify-end">
            <Link
              to="/cliente/envios"
              className="font-semibold text-blue-700 hover:underline"
            >
              Volver al historial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Banner({ type, title, desc }) {
  const cls =
    type === "danger"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-orange-200 bg-orange-50 text-orange-900";

  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <div className="font-bold">{title}</div>
      <div className="mt-1">{desc}</div>
    </div>
  );
}

function ShipmentCard({ data }) {
  const estado = (data?.estado || "PENDIENTE").toUpperCase();

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">
            Resumen del envío
          </h2>
          <p className="text-lg font-extrabold text-slate-800 mt-1">
            #{data?.nro_envio || "—"}
          </p>
        </div>

        <StatusBadge estado={estado.toLowerCase()} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MiniInfo
          icon={<MapPin className="h-4 w-4 text-blue-600" />}
          label="Origen"
          value={data?.detalles?.origen || "—"}
        />
        <MiniInfo
          icon={<MapPin className="h-4 w-4 text-emerald-600" />}
          label="Destino"
          value={data?.detalles?.destino || "—"}
        />
        <MiniInfo
          icon={<Package className="h-4 w-4 text-slate-500" />}
          label="Paquetes"
          value={data?.detalles?.paquetes ?? "—"}
        />
        <MiniInfo
          icon={<Clock className="h-4 w-4 text-slate-500" />}
          label="Entrega estimada"
          value={formatFechaEntrega(data?.fechas?.entrega_estimada)}
        />
      </div>

      {data?.pago?.confirmado && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
          <CheckCheck className="h-4 w-4" />
          Pago confirmado
        </div>
      )}
    </div>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-700">{value}</div>
    </div>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}