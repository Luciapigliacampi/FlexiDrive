// src/pages/cliente/DashboardCliente.jsx
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import boxImg from "../../assets/box.png";
import bgImg from "../../assets/background-dashboard-cliente.png";

import helpIcon from "../../assets/help-icon.png";
import mapIcon from "../../assets/direcciones-mapa.png";
import cardIcon from "../../assets/card.png";
import cardIdIcon from "../../assets/card-id.png";

// ✅ axios real
// MOCK
import { getMyShipments } from "../../services/shipmentServices";


export default function DashboardCliente() {
  const username = localStorage.getItem("username") || "Usuario";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [envios, setEnvios] = useState([]); // historial del back

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await getMyShipments();

// si es mock -> res es un array
// si es axios -> res.data
const data = Array.isArray(res) ? res : res?.data;

const list =
  Array.isArray(data) ? data :
  Array.isArray(data?.envios) ? data.envios :
  [];

setEnvios(list);
        // const res = await getMyShipments();
        // // axios -> res.data
        // const data = Array.isArray(res) ? res : res?.data;

        // // Ajuste flexible por si el back devuelve { envios: [...] }
        // const list = Array.isArray(data)
        //   ? data
        //   : Array.isArray(data?.envios)
        //     ? data.envios
        //     : [];

        // if (alive) setEnvios(list);
      } catch (e) {
        if (alive) setError(e?.message || "No se pudieron cargar los envíos.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ métricas (2) derivadas del historial
  const { activos, completados } = useMemo(() => {
    const upper = (v) => String(v || "").toUpperCase();

    const isCompletado = (estado) => upper(estado) === "ENTREGADO";
    const isActivo = (estado) => {
      const e = upper(estado);
      return e === "PENDIENTE" || e === "EN_CAMINO" || e === "ASIGNADO" || e === "ACEPTADO";
    };

    let a = 0;
    let c = 0;

    for (const s of envios) {
      const estado = s?.estado;
      if (isCompletado(estado)) c += 1;
      else if (isActivo(estado)) a += 1;
    }

    return { activos: a, completados: c };
  }, [envios]);

  // ✅ “Ver envíos” (preview)
  const ultimos3 = useMemo(() => {
    // Si tu back ya viene ordenado, ok. Si no, intentamos ordenar por fecha
    const copy = [...envios];
    copy.sort((a, b) => {
      const fa = new Date(a?.fecha || a?.createdAt || 0).getTime();
      const fb = new Date(b?.fecha || b?.createdAt || 0).getTime();
      return fb - fa;
    });
    return copy.slice(0, 3);
  }, [envios]);

  return (
    <main className="bg-slate-100">
      <section className="bg-slate-100">
        <div className="relative bg-slate-100 overflow-x-hidden max-h-[500px]">
          {/* CONTENIDO */}
          <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 lg:px-4 pt-4">
            {/* TITULO */}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-700">
                Hola, {username}
              </h1>
              <p className="mt-2 text-lg font-semibold text-slate-600">
                ¿Qué querés hacer hoy?
              </p>
            </div>

            {/* feedback */}
            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {/*CARDS*/}
            <div className="grid grid-cols-1 lg:grid-cols-3 mt-2">
              {/*METRICAS Y CARDS*/}
              <div className="lg:col-span-2">
                {/*METRICAS*/}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-slate-300 mb-4 mt-4">
                    <div className="col-span-1 flex items-center ml-2">
                      <Metric
                        number={loading ? "—" : String(activos)}
                        label="Envíos activos"
                      />
                    </div>
                    <div className="col-span-1 flex items-center ml-2">
                      <Metric
                        number={loading ? "—" : String(completados)}
                        label="Envíos completados"
                      />
                    </div>
                  </div>
                </div>

                {/* FILA 2: Solicitar + Ver envíos */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch h-auto">
                  <div className="lg:col-span-1">
                    <Card title="Solicitar envío">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <img
                          src={boxImg}
                          alt="Caja"
                          className="h-30 w-auto object-contain"
                        />

                        <Link
                          to="/cliente/solicitar-envio"
                          className="inline-flex items-center justify-center rounded-full bg-blue-700 px-6 py-2 font-semibold text-white hover:bg-blue-800 transition"
                        >
                          Solicitar envío
                        </Link>
                      </div>
                    </Card>
                  </div>

                  <div className="lg:col-span-1">
                    <Card title="Ver envíos" className="h-full">
                      <div className="mt-2">
                        {loading ? (
                          <div className="text-sm text-slate-500 py-6">
                            Cargando envíos...
                          </div>
                        ) : ultimos3.length === 0 ? (
                          <div className="text-sm text-slate-500 py-6">
                            Todavía no tenés envíos.
                          </div>
                        ) : (
                          <>
                            {ultimos3.map((e) => (
                              <EnvioRow
                                key={e?._id || e?.id}
                                id={e?.numero || e?._id || e?.id}
                                estado={e?.estado || "—"}
                                variant={estadoToVariant(e?.estado)}
                              />
                            ))}

                            <div className="pt-2 text-right">
                              <Link
                                to="/cliente/envios"
                                className="font-semibold text-blue-700 hover:underline"
                              >
                                Ver más
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              {/* DATOS, MEDIOS DE PAGO, ETC */}
              <div className="grid grid-cols-1 lg:col-span-1 h-full place-content-between ml-4">
                <QuickLink to="/cliente/datos" label="Mis Datos" icon={cardIdIcon} />
                <QuickLink to="/cliente/metodos-pago" label="Métodos de pago" icon={cardIcon} />
                <QuickLink to="/cliente/direcciones" label="Direcciones frecuentes" icon={mapIcon} />
                <QuickLink to="/cliente/soporte" label="Ayuda y soporte" icon={helpIcon} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100">
        <div className="relative min-h-[320px] md:min-h-[260px] z-10 space-y-8 bg-slate-100">
          <img
            src={bgImg}
            alt="Decoración"
            className="pointer-events-none select-none absolute bottom-0 w-screen object-cover object-center z-0"
          />
        </div>
      </section>
    </main>
  );
}

/* ===== Helpers ===== */

function Metric({ number, label }) {
  return (
    <div className="flex items-center gap-5">
      <div className="text-3xl font-extrabold text-blue-800 leading-none">
        {number}
      </div>
      <div className="text-lg font-semibold text-slate-800">{label}</div>
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="text-lg font-bold text-slate-700">{title}</div>
      {subtitle ? <div className="mt-1 text-slate-500">{subtitle}</div> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function QuickLink({ to, label, icon, className = "", big = false }) {
  return (
    <Link
      to={to}
      className={`
        flex items-center gap-4 rounded-xl border border-slate-200 bg-white
        ${big ? "px-4 py-4" : "p-3"}
        shadow-sm hover:bg-slate-50 transition
        ${className}
      `}
    >
      <img
        src={icon}
        alt={label}
        className={big ? "h-12 w-12 object-contain" : "h-10 w-10 object-contain"}
      />
      <div className="font-semibold text-slate-700 text-lg">{label}</div>
    </Link>
  );
}

function estadoToVariant(estado) {
  const e = String(estado || "").toUpperCase();
  if (e === "PENDIENTE") return "warning";
  if (e === "EN_CAMINO" || e === "ASIGNADO" || e === "ACEPTADO") return "info";
  if (e === "ENTREGADO") return "success";
  return "info";
}

function EnvioRow({ id, estado, variant }) {
  const badge =
    variant === "warning"
      ? "bg-yellow-100 text-yellow-800"
      : variant === "info"
        ? "bg-blue-100 text-blue-800"
        : "bg-green-100 text-green-800";

  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-2">
      <div className="font-semibold text-slate-700">Envío #{id}</div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>
        {estado}
      </span>
    </div>
  );
}