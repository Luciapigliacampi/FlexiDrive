// src/pages/cliente/HistorialEnvios.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { getMyShipments } from "../../services/shipmentServices";

export default function HistorialEnvios() {
  const [estado, setEstado] = useState("todos");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const res = await getMyShipments({ estado, q });

      //VER ACA

      // ✅ Normalizar: soporte mock/back
      const arr =
        Array.isArray(res) ? res :
        Array.isArray(res?.data) ? res.data :
        Array.isArray(res?.shipments) ? res.shipments :
        Array.isArray(res?.items) ? res.items :
        [];

      setRows(arr);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const filtered = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  return (
    <div className="space-y-6">
      <h1 className="text-5xl font-bold tracking-tight text-slate-700">Mis Envíos</h1>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="w-full max-w-xs rounded-lg border bg-white px-4 py-3 text-slate-700"
        >
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_camino">En camino</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <div className="w-full max-w-sm rounded-lg border bg-white px-4 py-3 text-slate-400">
          Rango de fechas
        </div>

        <div className="flex w-full items-center gap-2 rounded-lg border bg-white px-4 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por ciudad, cliente o comisionista"
            className="w-full outline-none text-slate-700"
          />
          <button
            onClick={load}
            className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
          >
            Buscar
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <EmptyState title="No hay envíos para mostrar" subtitle="Probá cambiando el estado o la búsqueda." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-80 text-slate-700">
              <tr className="text-sm font-semibold">
                <th className="px-6 py-4">Nro. de envío</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Destino</th>
                <th className="px-6 py-4">Comisionista</th>
                <th className="px-6 py-4">Fecha de entrega</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-6 py-4">
                    <Link to={`/cliente/envios/${s.id}`} className="font-bold text-blue-700 hover:underline">
                      #{s.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{s.cliente}</td>
                  <td className="px-6 py-4 text-slate-700">{s.destino}</td>
                  <td className="px-6 py-4 text-slate-700">{s.comisionista}</td>
                  <td className="px-6 py-4 text-slate-700">{s.fechaEntrega}</td>
                  <td className="px-6 py-4">
                    <StatusBadge estado={s.estado} />
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/cliente/envios/${s.id}`}
                      className="rounded-md border px-3 py-2 font-semibold text-slate-700 hover:bg-slate-80"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}