import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  UserCircle2,
  Mail,
  Phone,
  IdCard,
  CalendarDays,
  MapPin,
  Truck,
  CircleCheckBig,
  Clock3,
  Route,
  Wallet,
  Banknote,
  CreditCard,
  Check,
} from "lucide-react";

import Loader from "../../components/Loader";
import { getMyProfile } from "../../services/profileService/profileService";
import { getMyShipments } from "../../services/shipmentServices";
import { getMyVehicles } from "../../services/authService";
import {
  getEstadisticasComisionista,
  listRutas,
} from "../../services/comisionistaServices";

const LS_PROFILE_PHOTO_KEY = "flexidrive_profile_photo";
const LS_BANK_KEY = "flexidrive_datos_bancarios_comisionista";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatFecha(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR");
}

function safeValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDNI(dni) {
  if (!dni) return "—";
  const clean = String(dni).replace(/\D/g, "");
  if (!clean) return "—";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getEstadoEnvio(envio) {
  const raw = String(
    envio?.estado ??
      envio?.estadoId ??
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

  if (["ENTREGADO", "COMPLETADO", "COMPLETADA", "FINALIZADO", "FINALIZADA"].includes(raw))
    return "ENTREGADO";
  if (["EN_CAMINO", "EN CURSO", "EN_TRANSITO", "EN TRÁNSITO", "EN TRANSITO"].includes(raw))
    return "EN_CAMINO";
  if (["ASIGNADO", "ACEPTADO"].includes(raw)) return "ASIGNADO";
  if (["PENDIENTE", "CREADO", "PUBLICADO"].includes(raw)) return "PENDIENTE";

  return raw || "—";
}

function getShipmentNumber(envio) {
  return (
    envio?.numero_envio ||
    envio?.nro_envio ||
    envio?.numero ||
    envio?.shipmentNumber ||
    envio?.codigo ||
    envio?._id ||
    envio?.id ||
    "—"
  );
}

function getLocalProfilePhoto() {
  try {
    return localStorage.getItem(LS_PROFILE_PHOTO_KEY) || "";
  } catch {
    return "";
  }
}

function humanizeEstado(estado) {
  const e = String(estado || "").toUpperCase();
  if (e === "ENTREGADO") return "Entregado";
  if (e === "EN_CAMINO") return "En tránsito";
  if (e === "ASIGNADO") return "Aceptado";
  if (e === "PENDIENTE") return "Pendiente";
  return estado || "—";
}

function InfoCard({ title, accent = "blue", content }) {
  const accentClass = accent === "green" ? "bg-emerald-500" : "bg-blue-700";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full rounded-t-2xl ${accentClass}`} />
      <div className="flex h-full flex-col p-5">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        <div className="mt-3 h-px w-full bg-slate-200" />
        <div className="mt-5 flex h-full flex-col justify-between">{content}</div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <li className="list-none">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-700">{label}</div>
          <div className="mt-1 break-words text-sm text-slate-600">{value}</div>
        </div>
      </div>
    </li>
  );
}

function EmptyText({ text }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function PaymentChip({ icon, label, tone = "blue" }) {
  const toneClasses =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  const badgeClasses =
    tone === "green" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white";

  return (
    <div
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${toneClasses}`}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-bold">{label}</div>
          <div className="text-xs font-medium opacity-80">Habilitado</div>
        </div>
      </div>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${badgeClasses}`}
      >
        <Check className="h-4 w-4" />
      </div>
    </div>
  );
}

export default function PerfilComisionista() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [p, setP] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [estadisticas, setEstadisticas] = useState(null);
  const [datosPagoLocal, setDatosPagoLocal] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);

  const userRaw = localStorage.getItem("user");
  const userId = userRaw ? JSON.parse(userRaw)?.id : null;

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      try {
        setLoading(true);
        setError("");
        setWarning("");

        const perfilData = await getMyProfile();

        const [enviosData, estadisticasData, vehiculosData, rutasData] =
          await Promise.all([
            getMyShipments().catch(() => {
              if (alive)
                setWarning((prev) =>
                  prev
                    ? `${prev} No se pudo cargar el historial de envíos.`
                    : "No se pudo cargar el historial de envíos."
                );
              return [];
            }),
            userId
              ? getEstadisticasComisionista(userId).catch(() => {
                  if (alive)
                    setWarning((prev) =>
                      prev
                        ? `${prev} No se pudieron cargar las estadísticas.`
                        : "No se pudieron cargar las estadísticas."
                    );
                  return null;
                })
              : Promise.resolve(null),
            getMyVehicles().catch(() => []),
            listRutas({}).catch(() => []),
          ]);

        if (!alive) return;

        setP(perfilData || null);
        setEnvios(Array.isArray(enviosData) ? enviosData : []);
        setEstadisticas(estadisticasData || null);
        setVehiculos(Array.isArray(vehiculosData) ? vehiculosData : []);
        setRutas(Array.isArray(rutasData) ? rutasData : []);
        setProfilePhoto(getLocalProfilePhoto());
        setDatosPagoLocal(safeJsonParse(localStorage.getItem(LS_BANK_KEY), null));
      } catch (err) {
        if (!alive) return;
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "No se pudieron cargar los datos del comisionista."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadAll();

    function onStorage(e) {
      if (e.key === LS_BANK_KEY)
        setDatosPagoLocal(safeJsonParse(e.newValue, null));
      if (e.key === LS_PROFILE_PHOTO_KEY)
        setProfilePhoto(e.newValue || "");
    }

    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  useEffect(() => {
    function handleFocus() {
      setDatosPagoLocal(safeJsonParse(localStorage.getItem(LS_BANK_KEY), null));
      setProfilePhoto(getLocalProfilePhoto());
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const nombreCompleto = useMemo(() => {
    if (!p) return "—";
    return `${p?.nombre || ""} ${p?.apellido || ""}`.trim() || "—";
  }, [p]);

  const ultimasRutas = useMemo(() => rutas.slice(0, 3), [rutas]);

  const vehiculoPrincipal = useMemo(() => vehiculos[0] || null, [vehiculos]);

  const actividadReciente = useMemo(() => {
    const copy = [...envios];
    copy.sort((a, b) => {
      const fa = new Date(a?.fecha || a?.createdAt || a?.fecha_creacion || 0).getTime();
      const fb = new Date(b?.fecha || b?.createdAt || b?.fecha_creacion || 0).getTime();
      return fb - fa;
    });
    return copy.slice(0, 3).map((envio) => ({
      numero: getShipmentNumber(envio),
      estado: getEstadoEnvio(envio),
    }));
  }, [envios]);

  const resumenActividad = useMemo(
    () => ({
      ingresosTotales: Number(estadisticas?.ingresosTotales || 0),
      ingresoPromedio: Number(
        estadisticas?.ingresoPromedio || estadisticas?.ingresoPromedioViaje || 0
      ),
      distanciaPromedio: Number(
        estadisticas?.distanciaPromedio || estadisticas?.distanciaPromedioViaje || 0
      ),
    }),
    [estadisticas]
  );

  const mediosPago = useMemo(() => {
    const com = p?.comisionista || {};
    const origen =
      datosPagoLocal ||
      p?.datos_bancarios ||
      p?.datosBancarios ||
      p?.medioPago ||
      p?.medio_pago ||
      {};
    return {
      aceptaEfectivo: Boolean(origen?.aceptaEfectivo),
      aceptaTransferencia: Boolean(origen?.aceptaTransferencia) || Boolean(com?.cbu),
    };
  }, [p, datosPagoLocal]);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          No se encontraron datos del perfil.
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
          Perfil de comisionista
        </h1>
        <div className="mt-4 h-px w-full bg-slate-200" />
      </section>

      {warning && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-blue-100 ring-4 ring-blue-50">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-24 w-24 text-blue-700" strokeWidth={1.5} />
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-slate-800">{nombreCompleto}</h2>
              <div className="space-y-2 text-slate-600">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-700" />
                  <span>{safeValue(p?.email)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-blue-700" />
                  <span>{safeValue(p?.telefono)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-start lg:justify-end">
            <Link
              to="/comisionista/perfil/editar"
              className="inline-flex items-center justify-center rounded-2xl border border-blue-700 bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Editar perfil
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <InfoCard
          title="Datos personales"
          accent="blue"
          content={
            <ul className="space-y-4">
              <InfoItem
                icon={<UserCircle2 className="h-5 w-5 text-blue-700" />}
                label="Nombre"
                value={nombreCompleto}
              />
              <InfoItem
                icon={<IdCard className="h-5 w-5 text-blue-700" />}
                label="Documento"
                value={formatDNI(p?.dni)}
              />
              <InfoItem
                icon={<CalendarDays className="h-5 w-5 text-blue-700" />}
                label="Fecha de nacimiento"
                value={formatFecha(p?.fecha_nacimiento)}
              />
            </ul>
          }
        />

        <InfoCard
          title="Rutas"
          accent="blue"
          content={
            <>
              {ultimasRutas.length > 0 ? (
                <ul className="space-y-4">
                  {ultimasRutas.map((ruta, idx) => {
                    const origen = ruta?.origen?.localidadNombre || "—";
                    const destino = ruta?.destino?.localidadNombre || "—";
                    const activa = ruta?.activa ?? true;
                    return (
                      <InfoItem
  key={ruta?._id || ruta?.id || idx}
  icon={<MapPin className="h-5 w-5 text-blue-700" />}
  label={`${origen} → ${destino}`}
  value={
    [
      activa ? "Activa" : "Pausada",
      ruta?.dias?.length ? ruta.dias.join(" · ") : null,
    ]
      .filter(Boolean)
      .join(" — ")
  }
/>
                    );
                  })}
                </ul>
              ) : (
                <EmptyText text="Todavía no tenés rutas cargadas." />
              )}

              <div className="pt-4">
                <Link
                  to="/comisionista/rutas"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Gestionar rutas
                </Link>
              </div>
            </>
          }
        />

        <InfoCard
          title="Actividad reciente"
          accent="blue"
          content={
            <>
              {actividadReciente.length > 0 ? (
                <ul className="space-y-4">
                  {actividadReciente.map((item, idx) => (
                    <InfoItem
                      key={`${item.numero}-${idx}`}
                      icon={
                        item.estado === "ENTREGADO" ? (
                          <CircleCheckBig className="h-5 w-5 text-blue-700" />
                        ) : item.estado === "EN_CAMINO" ? (
                          <Truck className="h-5 w-5 text-blue-700" />
                        ) : (
                          <Clock3 className="h-5 w-5 text-amber-600" />
                        )
                      }
                      label={`Envío #${item.numero}`}
                      value={humanizeEstado(item.estado)}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyText text="Todavía no tenés actividad reciente." />
              )}

              <div className="pt-4">
                <Link
                  to="/comisionista/envios"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver envíos
                </Link>
              </div>
            </>
          }
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <InfoCard
          title="Resumen de actividad"
          accent="green"
          content={
            <ul className="space-y-4">
              <InfoItem
                icon={<Wallet className="h-5 w-5 text-emerald-600" />}
                label="Ingresos totales"
                value={`$${resumenActividad.ingresosTotales.toLocaleString("es-AR")}`}
              />
              <InfoItem
                icon={<CircleCheckBig className="h-5 w-5 text-emerald-600" />}
                label="Ingreso promedio por viaje"
                value={`$${resumenActividad.ingresoPromedio.toLocaleString("es-AR", {
                  maximumFractionDigits: 0,
                })}`}
              />
              <InfoItem
                icon={<Route className="h-5 w-5 text-emerald-600" />}
                label="Distancia promedio por viaje"
                value={`${resumenActividad.distanciaPromedio.toLocaleString("es-AR", {
                  maximumFractionDigits: 1,
                })} km`}
              />
            </ul>
          }
        />

        <InfoCard
          title="Vehículo"
          accent="green"
        
          content={
              <>
            {vehiculoPrincipal ? (
              <ul className="space-y-4">
                <InfoItem
                  icon={<Truck className="h-5 w-5 text-emerald-600" />}
                  label="Nombre"
                  value={safeValue(vehiculoPrincipal?.nombre)}
                />
                <InfoItem
                  icon={<Truck className="h-5 w-5 text-emerald-600" />}
                  label="Tipo"
                  value={safeValue(vehiculoPrincipal?.tipo)}
                />
                <InfoItem
                  icon={<Truck className="h-5 w-5 text-emerald-600" />}
                  label="Marca / modelo"
                  value={safeValue(
                    [vehiculoPrincipal?.marca, vehiculoPrincipal?.modelo]
                      .filter(Boolean)
                      .join(" ")
                  )}
                />
                <InfoItem
                  icon={<IdCard className="h-5 w-5 text-emerald-600" />}
                  label="Patente"
                  value={safeValue(vehiculoPrincipal?.patente)}
                />
              </ul>
            ) : (
              <EmptyText text="Todavía no tenés vehículos registrados." />
            )}
           <div className="pt-4">
        <Link
          to="/comisionista/vehiculos"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Gestionar vehículos
        </Link>
      </div>
          </>
          }
        />

        <InfoCard
          title="Medios de pago"
          accent="green"
          content={
            <>
              {mediosPago.aceptaEfectivo || mediosPago.aceptaTransferencia ? (
                <div className="space-y-3">
                  {mediosPago.aceptaEfectivo && (
                    <PaymentChip
                      icon={<Banknote className="h-4 w-4" />}
                      label="Efectivo"
                      tone="green"
                    />
                  )}
                  {mediosPago.aceptaTransferencia && (
                    <PaymentChip
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Transferencia bancaria / billetera"
                      tone="blue"
                    />
                  )}
                </div>
              ) : (
                <EmptyText text="Todavía no tenés medios de pago habilitados." />
              )}

              <div className="pt-4">
                <Link
                  to="/comisionista/medios-pago"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Administrar medios de pago
                </Link>
              </div>
            </>
          }
        />
      </section>
    </main>
  );
}
