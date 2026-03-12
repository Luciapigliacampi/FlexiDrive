// src/pages/cliente/SeleccionComisionista.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import {
  searchComisionistas
} from "../../services/shipmentServices";
import heroImg from "../../assets/cart.png";
import api from "../../services/api";

function getApiErrorMessage(err, fallback = "Ocurrió un error.") {
  const data = err?.response?.data;
  if (Array.isArray(data?.detalles) && data.detalles.length > 0) {
    return data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join("\n");
  }
  return data?.error || data?.message || err?.message || fallback;
}

// ✅ helper moneda ARS (sin decimales)
const moneyARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

export default function SeleccionComisionista() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [list, setList] = useState([]); // ✅ siempre array
  const [selected, setSelected] = useState(null);

  // draft del formulario (para UI)
  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("draftEnvio") || "{}");
    } catch {
      return {};
    }
  }, []);

  // payload base (para crear envío)
  const payloadBase = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("draftEnvioPayloadBase") || "{}");
    } catch {
      return {};
    }
  }, []);

  // params para búsqueda (ideal)
  const draftBusqueda = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("draftBusqueda") || "{}");
    } catch {
      return {};
    }
  }, []);

  // valores a mostrar + enviar en search
  const resumen = useMemo(() => {
    const bultos = Array.isArray(draft?.paquetes)
      ? draft.paquetes.reduce((acc, p) => acc + Math.max(1, parseInt(p.cantidad) || 1), 0)
      : 1;

    // Preferimos draftBusqueda (porque ya lo preparaste en SolicitarEnvio)
    const origenCiudad = draftBusqueda?.origenCiudad || payloadBase?.origenCiudad || "";
    const destinoCiudad = draftBusqueda?.destinoCiudad || payloadBase?.destinoCiudad || "";
    const fechaEntrega = draftBusqueda?.fechaEntrega || draft?.fechaEntrega || "";

    return { origenCiudad, destinoCiudad, fechaEntrega, bultos };
  }, [draft, payloadBase, draftBusqueda]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        // Validación mínima para buscar
        if (!resumen.fechaEntrega) throw new Error("Falta la fecha de entrega.");
        if (!resumen.origenCiudad) throw new Error("Falta la ciudad de origen.");
        if (!resumen.destinoCiudad) throw new Error("Falta la ciudad de destino.");

        const res = await searchComisionistas({
          fechaEntrega: resumen.fechaEntrega,
          origenLocalidadId: resumen.origenCiudad?.localidadId,
          origenLocalidadNombre: resumen.origenCiudad?.localidadNombre,
          destinoLocalidadId: resumen.destinoCiudad?.localidadId,
          destinoLocalidadNombre: resumen.destinoCiudad?.localidadNombre,
          bultos: resumen.bultos,
        });

        // res = { total, comisionistas } o axios res
        const arr =
          Array.isArray(res) ? res :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.comisionistas) ? res.comisionistas :
                Array.isArray(res?.items) ? res.items :
                  Array.isArray(res?.data?.comisionistas) ? res.data.comisionistas :
                    [];

        console.log("Respuesta comisionistas:", arr);

        // ✅ Normalizamos para UI (ahora incluimos descuento)
        const normalized = arr.map((c) => {
          const precioBase = c.precioBase ?? null;
          const descuentoAplicado = c.descuentoAplicado ?? 0;

          // ✅ precioEstimado (final) si viene; si no, fallback razonable
          const precioFinal =
            c.precioEstimado ?? (precioBase != null ? precioBase : null);

          return ({
            id: String(c.comisionistaId ?? c.id ?? ""),     // id = comisionistaId (string)
            tripPlanId: String(c.tripPlanId ?? ""),
            nombre: c.nombre || "Comisionista",
            rating: c.rating ?? 4.7,

            precioPorBulto: c.precioPorBulto ?? null,
            bultos: c.bultos ?? resumen.bultos,

            // ✅ nuevos
            precioBase,
            descuentoAplicado,
            precioEstimado: precioFinal, // usamos precioEstimado como "final" en UI
            descuentoPorBultos: c.descuentoPorBultos ?? null,

            ruta: c.ruta,
          });
        }).filter((c) => c.id && c.tripPlanId);

        const CAL_BASE = import.meta.env.VITE_CALIFICACIONES_API_URL || "http://localhost:3003";
const enriched = await Promise.all(
  normalized.map(async (c) => {
    try {
      const r = await api.get(`${CAL_BASE}/api/calificaciones/${c.id}`);
      return { ...c, rating: r.data?.promedio ?? c.rating };
    } catch {
      return c;
    }
  })
);

if (!alive) return;
setList(enriched);
setSelected(enriched?.[0]?.id ?? null);
      } catch (e) {
        if (!alive) return;
        setList([]);
        setSelected(null);
        setError(getApiErrorMessage(e, "No se pudieron buscar comisionistas."));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ confirmar() simplificado - no necesita try/catch complejo
function confirmar() {
  const comi = list.find((c) => String(c.id) === String(selected));
  if (!comi) return;

  localStorage.setItem("draftComisionista", JSON.stringify({
    id: comi.id,
    tripPlanId: comi.tripPlanId,
    nombre: comi.nombre,
    rating: comi.rating,
    precioPorBulto: comi.precioPorBulto,
    bultos: comi.bultos,
    precioBase: comi.precioBase,
    descuentoAplicado: comi.descuentoAplicado,
    precioEstimado: comi.precioEstimado,
    descuentoPorBultos: comi.descuentoPorBultos,
  }));

  navigate("/cliente/confirmacion-envio");
}

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 m-8">
      <div className="rounded-xl border bg-white p-6 col-span-7">
        <h1 className="text-4xl font-bold text-slate-700">Seleccioná un comisionista</h1>
        <p className="mt-2 text-slate-500">Elegí quién va a retirar y entregar tu paquete.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-xl border bg-slate-50 p-4">
          <div className="font-semibold text-slate-700">Resumen del envío</div>
          <div className="mt-2 text-sm text-slate-600">
            <div>
              <b>Origen ciudad:</b>{" "}
              {resumen.origenCiudad?.localidadNombre || "—"}
            </div>

            <div>
              <b>Destino ciudad:</b>{" "}
              {resumen.destinoCiudad?.localidadNombre || "—"}
            </div>
            <div><b>Fecha entrega:</b> {resumen.fechaEntrega || "—"}</div>
            <div><b>Disponible para retiro:</b> {draft?.franjaHorariaRetiro || "—"}</div>
            <div><b>Bultos:</b> {resumen.bultos}</div>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <Loader label="Buscando comisionistas..." />
          ) : list.length === 0 ? (
            <EmptyState title="No hay comisionistas disponibles" subtitle="Probá más tarde o cambiá la fecha." />
          ) : (
            <div className="space-y-4">
              {list.map((c) => {
                const tieneDescuento = (c.descuentoAplicado || 0) > 0;

                return (
                  <label
                    key={`${c.id}-${c.tripPlanId}`}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-5 hover:bg-slate-50 ${selected === c.id ? "border-blue-700" : ""
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="radio"
                        name="comi"
                        checked={selected === c.id}
                        onChange={() => setSelected(c.id)}
                      />
                      <div>
                        <div className="text-lg font-bold text-slate-700">{c.nombre}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          📍 {c.ruta?.origen?.localidadNombre || "—"} → {c.ruta?.destino?.localidadNombre || "—"}
                        </div>
                       <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
  <span className="text-yellow-500">★</span>
  <span className="font-semibold text-slate-700">{Number(c.rating).toFixed(1)}</span>
  <span className="text-slate-400">/ 10</span>
</div>
                        <div className="text-xs text-slate-500">
                          {c.precioPorBulto != null ? `${moneyARS(c.precioPorBulto)} x bulto` : "—"}{" "}
                          ({c.bultos ?? "—"})
                        </div>

                        {/* ✅ badge/leyenda del descuento (si viene info) */}
                        {tieneDescuento && (
                          <div className="mt-1 text-xs font-semibold text-green-700">
                            Descuento aplicado: {moneyARS(c.descuentoAplicado)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {tieneDescuento && c.precioBase != null && (
                        <div className="text-xs text-slate-500 line-through">
                          Antes: {moneyARS(c.precioBase)}
                        </div>
                      )}

                      <div className="text-lg font-bold text-slate-700">
                        {c.precioEstimado != null ? moneyARS(c.precioEstimado) : "—"}
                      </div>

                      {tieneDescuento && (
                        <div className="text-xs text-green-700 font-semibold">
                          Ahorrás {moneyARS(c.descuentoAplicado)}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/cliente/solicitar-envio")}
            className="rounded-full border px-8 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>

          <button
            type="button"
            disabled={!selected || loading}
            onClick={confirmar}
            className="rounded-full bg-blue-700 px-10 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {"Confirmar envío"}
          </button>
        </div>
      </div>

      <div className="hidden lg:block col-span-5">
        <div className="max-w-[600px] pt-10 flex items-center justify-center">
          <img src={heroImg} alt="Cajas apiladas" className="w-full object-fill" />
        </div>
      </div>
    </div>
  );
}