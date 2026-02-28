import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ClipboardList,
  Route,
  Check,
  Trash2,
  X,
} from "lucide-react";

import { Card } from "../../components/UI";
import StatusBadge from "../../components/StatusBadge";
import {
  getDashboardResumen,
  getAgendaHoy,
  getRutaSugerida,
} from "../../services/comisionistaServices";

export default function DashboardComisionista() {
  const username = localStorage.getItem("username") || "Usuario";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [resumen, setResumen] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [ruta, setRuta] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const [r1, r2, r3] = await Promise.all([
          getDashboardResumen(),
          getAgendaHoy(),
          getRutaSugerida(),
        ]);

        if (!alive) return;

        setResumen(r1);
        setAgenda(Array.isArray(r2) ? r2 : []);
        setRuta(r3);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "No se pudo cargar el dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const r = resumen || {};
    return [
      { value: loading ? "—" : String(r.enviosHoy ?? 0), label: "Envíos hoy" },
      { value: loading ? "—" : String(r.enRuta ?? 0), label: "En ruta" },
      { value: loading ? "—" : String(r.pendientesRetiro ?? 0), label: "Pendientes de retiro" },
      { value: loading ? "—" : String(r.calificacion ?? "—"), label: "Calificación" },
    ];
  }, [resumen, loading]);

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-700">
          Hola, {username}
        </h1>
        <p className="mt-2 text-xl font-semibold text-slate-600">
          ¿Qué querés hacer hoy?
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Acciones rápidas */}
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

      {/* Métricas */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 gap-y-4 md:grid-cols-4 md:divide-x md:divide-slate-200 p-4">
          {metrics.map((m) => (
            <Metric key={m.label} value={m.value} label={m.label} />
          ))}
        </div>
      </div>

      {/* Tabla + Ruta sugerida */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tabla */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-blue-800 mb-3">
            Entregas y retiros programados para hoy
          </h2>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-xs font-bold uppercase tracking-wide">
                  <th className="px-4 py-3 w-[140px]">Orden de entrega</th>
                  <th className="px-4 py-3 w-[140px]">Nro. de envío</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3 w-[140px]">Localidad</th>
                  <th className="px-4 py-3 w-[140px]">Estado</th>
                  <th className="px-4 py-3 w-[120px]">Acción</th>
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
                    <tr key={row.id} className="border-t border-slate-200 text-sm">
                      <td className="px-4 py-3 text-slate-700">{row.orden}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/comisionista/envios/${row.id}`}
                          className="font-bold text-blue-700 hover:underline"
                        >
                          #{row.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.cliente}</td>
                      <td className="px-4 py-3 text-slate-700">{row.destino}</td>
                      <td className="px-4 py-3 text-slate-700">{row.localidad}</td>
                      <td className="px-4 py-3">
                        <StatusBadge estado={row.estado} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-slate-600">
                          <IconBtn title="Marcar ok" onClick={() => console.log("ok", row.id)}>
                            <Check className="h-4 w-4 text-blue-700" />
                          </IconBtn>
                          <IconBtn title="Eliminar" onClick={() => console.log("del", row.id)}>
                            <Trash2 className="h-4 w-4 text-blue-700" />
                          </IconBtn>
                          <IconBtn title="Cancelar" onClick={() => console.log("cancel", row.id)}>
                            <X className="h-4 w-4 text-blue-700" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ruta sugerida */}
        <div>
          <Card title="Ruta sugerida">
            <div className="text-sm font-semibold text-slate-600 -mt-2">
              {ruta?.titulo || "Villa María - Córdoba"}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border bg-slate-100">
              {/* Placeholder mapa (después lo reemplazás por Google Maps/Leaflet) */}
              <div className="h-[260px] w-full grid place-items-center text-slate-400">
                Mapa
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <LegendItem color="bg-blue-700" label={`Retiro ${ruta?.retiros ?? 0}`} />
              <LegendItem color="bg-blue-700" label={`Retiro ${ruta?.retiros2 ?? 0}`} />
              <LegendItem color="bg-emerald-600" label={`Entrega ${ruta?.entregas ?? 0}`} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

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

function IconBtn({ title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="h-8 w-8 rounded-md hover:bg-slate-100 grid place-items-center"
    >
      {children}
    </button>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-slate-700 font-semibold">
      <span className={`h-4 w-4 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}