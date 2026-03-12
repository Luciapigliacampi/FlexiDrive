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
} from "lucide-react";
import Loader from "../../components/Loader";
import {
  getMyProfile,
  getDirecciones,
} from "../../services/profileService/profileService";
import { getMyShipments } from "../../services/shipmentServices";

const LS_PROFILE_PHOTO_KEY = "flexidrive_profile_photo";

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

  if (
    raw === "ENTREGADO" ||
    raw === "COMPLETADO" ||
    raw === "COMPLETADA" ||
    raw === "FINALIZADO" ||
    raw === "FINALIZADA"
  ) {
    return "ENTREGADO";
  }

  if (
    raw === "EN_CAMINO" ||
    raw === "EN CURSO" ||
    raw === "EN_TRANSITO" ||
    raw === "EN TRÁNSITO" ||
    raw === "EN TRANSITO"
  ) {
    return "EN_CAMINO";
  }

  if (raw === "ASIGNADO" || raw === "ACEPTADO") {
    return "ASIGNADO";
  }

  if (raw === "PENDIENTE" || raw === "CREADO" || raw === "PUBLICADO") {
    return "PENDIENTE";
  }

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
  if (e === "ASIGNADO") return "Asignado";
  if (e === "PENDIENTE") return "Pendiente";

  return estado || "—";
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildDireccionDetalle(dir) {
  const direccionBase = String(dir?.direccion || dir?.calle || "").trim();
  const ciudad = String(dir?.ciudad || dir?.localidad || "").trim();
  const provincia = String(dir?.provincia || "").trim();

  const direccionNorm = normalizeText(direccionBase);
  const ciudadNorm = normalizeText(ciudad);
  const provinciaNorm = normalizeText(provincia);

  const incluyeCiudad =
    ciudadNorm && direccionNorm.includes(ciudadNorm);

  const incluyeProvincia =
    provinciaNorm && direccionNorm.includes(provinciaNorm);

  const partes = [direccionBase];

  if (ciudad && !incluyeCiudad) partes.push(ciudad);
  if (provincia && !incluyeProvincia) partes.push(provincia);

  return partes.filter(Boolean).join(", ");
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

export default function PerfilCliente() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [p, setP] = useState(null);
  const [direcciones, setDirecciones] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      try {
        setLoading(true);
        setError("");

        const [perfilData, direccionesData, enviosData] = await Promise.all([
          getMyProfile(),
          getDirecciones().catch(() => []),
          getMyShipments().catch(() => []),
        ]);

        if (!alive) return;

        setP(perfilData || null);
        setDirecciones(Array.isArray(direccionesData) ? direccionesData : []);
        setEnvios(Array.isArray(enviosData) ? enviosData : []);
        setProfilePhoto(getLocalProfilePhoto());
      } catch (err) {
        if (!alive) return;

        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "No se pudieron cargar los datos del cliente."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadAll();

    return () => {
      alive = false;
    };
  }, []);

  const nombreCompleto = useMemo(() => {
    if (!p) return "—";
    const full = `${p?.nombre || ""} ${p?.apellido || ""}`.trim();
    return full || "—";
  }, [p]);

  const ultimasDirecciones = useMemo(() => direcciones.slice(0, 3), [direcciones]);

  const actividadReciente = useMemo(() => {
    const copy = [...envios];

    copy.sort((a, b) => {
      const fa = new Date(
        a?.fecha || a?.createdAt || a?.fecha_creacion || 0
      ).getTime();
      const fb = new Date(
        b?.fecha || b?.createdAt || b?.fecha_creacion || 0
      ).getTime();
      return fb - fa;
    });

    return copy.slice(0, 3).map((envio) => ({
      numero: getShipmentNumber(envio),
      estado: getEstadoEnvio(envio),
    }));
  }, [envios]);

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
          Perfil de usuario
        </h1>
        <div className="mt-4 h-px w-full bg-slate-200" />
      </section>

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
              to="/cliente/perfil/editar"
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
          title="Direcciones"
          accent="blue"
          content={
            <>
              {ultimasDirecciones.length > 0 ? (
                <ul className="space-y-4">
                  {ultimasDirecciones.map((dir, idx) => {
                    const titulo =
                      dir?.alias ||
                      dir?.nombre ||
                      dir?.direccion ||
                      dir?.calle ||
                      `Dirección ${idx + 1}`;

                    const detalle = buildDireccionDetalle(dir);

                    return (
                      <InfoItem
                        key={dir?._id || dir?.id || idx}
                        icon={<MapPin className="h-5 w-5 text-blue-700" />}
                        label={titulo}
                        value={detalle || "Guardada"}
                      />
                    );
                  })}
                </ul>
              ) : (
                <EmptyText text="Todavía no tenés direcciones guardadas." />
              )}

              <div className="pt-4">
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/cliente/direcciones"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Mis direcciones
                  </Link>

                  <Link
                    to="/cliente/destinatarios"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Destinatarios frecuentes
                  </Link>
                </div>
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
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/cliente/envios"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Todos mis envíos
                  </Link>
                </div>
              </div>
            </>
          }
        />
      </section>
    </main>
  );
}