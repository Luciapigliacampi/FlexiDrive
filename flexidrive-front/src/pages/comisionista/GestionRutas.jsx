// flexidrive-front/src/pages/comisionista/GestionRutas.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import RutaModal from "./RutaModal";
import {
  listRutas,
  createRuta,
  updateRuta,
  deleteRuta,
  toggleRutaActiva,
} from "../../services/comisionistaServices";
import { rutaToTripPlanPayload } from "../../services/tripPlanMappers";
import { useToast } from "../../components/toast/useToast";

function getRutaId(ruta) {
  return ruta?._id ?? ruta?.id ?? "";
}

export default function GestionRutas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [q, setQ] = useState(searchParams.get("q") || "");
  useEffect(() => {
    setQ(searchParams.get("q") || "");
  }, [searchParams]);

  const [rutas, setRutas] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editRuta, setEditRuta] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listRutas({ q });
      setRutas(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar las rutas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSearch(e) {
    e.preventDefault();
    load();
  }

  function openNew() {
    setEditRuta(null);
    setOpenModal(true);
  }

  function openEdit(r) {
    setEditRuta(r);
    setOpenModal(true);
  }

  async function onSave(payloadRutaUI) {
    try {
      const payload = rutaToTripPlanPayload(payloadRutaUI);
      const id = getRutaId(editRuta);

      if (id) {
        await updateRuta(id, payload);
        toast.success("Ruta actualizada correctamente.");
      } else {
        await createRuta(payload);
        toast.success("Ruta creada correctamente.");
      }

      setOpenModal(false);
      await load();
    } catch (e) {
      toast.error(e?.message || "No se pudo guardar la ruta.");
    }
  }

  function onDelete(id) {
    toast.confirm("¿Eliminar esta ruta?", {
      label: "Eliminar",
      onConfirm: async () => {
        try {
          await deleteRuta(id);
          toast.success("Ruta eliminada correctamente.");
          await load();
        } catch (e) {
          toast.error(e?.message || "No se pudo eliminar la ruta.");
        }
      },
    });
  }

  async function toggleActiva(r) {
    try {
      const nextActiva = !r.activa;
      await toggleRutaActiva(getRutaId(r), nextActiva);
      toast.success(nextActiva ? "Ruta activada correctamente." : "Ruta pausada correctamente.");
      await load();
    } catch (e) {
      toast.error(e?.message || "No se pudo actualizar el estado de la ruta.");
    }
  }

  const count = useMemo(() => rutas.length, [rutas]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Gestión de rutas</h1>
          <p className="text-slate-600 font-semibold">
            Administrá las rutas que realizás ({count})
          </p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-700 text-white font-bold hover:bg-blue-800"
        >
          <Plus className="h-5 w-5" />
          Nueva ruta
        </button>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <div className="flex items-center gap-2 flex-1 rounded-md border bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por origen, destino, localidad, precio o día..."
            className="w-full outline-none text-sm"
          />
        </div>
        <button className="px-4 py-2 rounded-md border bg-white hover:bg-slate-50 font-bold">
          Buscar
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="rounded-xl border bg-white p-6 text-slate-500">Cargando rutas...</div>
        ) : rutas.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-slate-500">
            No tenés rutas cargadas. Creá una con "Nueva ruta".
          </div>
        ) : (
          rutas.map((r) => {
            const id = getRutaId(r);
            return (
              <RutaCard
                key={id}
                ruta={r}
                onEdit={() => openEdit(r)}
                onDelete={() => onDelete(id)}
                onToggle={() => toggleActiva(r)}
              />
            );
          })
        )}
      </div>

      <RutaModal
        open={openModal}
        initial={editRuta}
        onClose={() => setOpenModal(false)}
        onSave={onSave}
      />
    </div>
  );
}

function RutaCard({ ruta, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  const origen = ruta?.origen?.localidadNombre || "—";
  const destino = ruta?.destino?.localidadNombre || "—";
  const intermedias = Array.isArray(ruta?.intermedias) ? ruta.intermedias : [];
  const dias = Array.isArray(ruta?.dias) ? ruta.dias : [];
  const activa = ruta?.activa ?? true;
  const precios = Array.isArray(ruta?.preciosPorLocalidad) ? ruta.preciosPorLocalidad : [];
  const preciosCount = precios.length;
  const descuento = ruta?.descuentoPorBultos;
  const tieneDescuento =
    descuento && Number(descuento.valor) > 0 && Number(descuento.minBultos) > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-all">
      <div
        className="p-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-extrabold text-slate-800">
                {origen} <span className="text-slate-400">→</span> {destino}
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activa
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {activa ? "Activa" : "Pausada"}
              </span>
              {preciosCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                  {preciosCount} localidades con precio
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                  Sin precios
                </span>
              )}
              {tieneDescuento && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700">
                  Descuento desde {descuento.minBultos} bultos
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {dias.map((d) => (
                <span
                  key={d}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  {d}
                </span>
              ))}
            </div>

            {intermedias.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {intermedias.map((x, idx) => (
                  <span
                    key={`${x.localidadNombre}-${idx}`}
                    className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold"
                  >
                    {x.localidadNombre}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-semibold">
                Sin localidades intermedias
              </div>
            )}
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <IconBtn title="Editar" onClick={onEdit}>
              <Pencil className="h-4 w-4 text-blue-700" />
            </IconBtn>
            <IconBtn title="Eliminar" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-blue-700" />
            </IconBtn>
            <IconBtn title={activa ? "Pausar" : "Activar"} onClick={onToggle}>
              {activa ? (
                <PauseCircle className="h-4 w-4 text-blue-700" />
              ) : (
                <PlayCircle className="h-4 w-4 text-blue-700" />
              )}
            </IconBtn>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400 font-semibold">
          <span>{expanded ? "▲ Ocultar detalle" : "▼ Ver precios y detalle"}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
          <div>
            <div className="text-sm font-bold text-slate-700 mb-2">Precios por localidad</div>
            {precios.length === 0 ? (
              <div className="text-sm text-slate-500">Sin precios cargados.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {precios.map((p) => (
                  <div
                    key={p.localidadNombre}
                    className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-slate-700">
                      {p.localidadNombre}
                    </span>
                    <span className="text-sm font-extrabold text-blue-700">
                      ${p.precioPorBulto}/bulto
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-sm font-bold text-slate-700 mb-2">Descuento por cantidad</div>
            {tieneDescuento ? (
              <div className="rounded-lg border bg-purple-50 px-3 py-2 text-sm text-purple-800 font-semibold">
                Desde <strong>{descuento.minBultos}</strong> bultos:{" "}
                {descuento.tipo === "porcentaje"
                  ? `${descuento.valor}% de descuento`
                  : `$${descuento.valor} de descuento por bulto`}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Sin descuento configurado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="h-9 w-9 rounded-md hover:bg-slate-100 grid place-items-center"
    >
      {children}
    </button>
  );
}