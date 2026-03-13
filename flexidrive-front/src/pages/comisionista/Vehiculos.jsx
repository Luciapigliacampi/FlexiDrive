// flexidrive-front/src/pages/comisionista/Vehiculos.jsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Car } from "lucide-react";
import { Card } from "../../components/UI";
import { useToast } from "../../components/toast/useToast";
import {
  getMyVehicles,
  registerVehiculo,
  updateVehiculo,
  deleteVehiculo,
} from "../../services/authService";
import VehiculoModal from "./VehiculoModal";

function getVehicleId(v) {
  return v?._id ?? v?.id ?? "";
}

export default function Vehiculos() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vehiculos, setVehiculos] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getMyVehicles();
      setVehiculos(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los vehículos.");
      setVehiculos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const count = useMemo(() => vehiculos.length, [vehiculos]);

  function openNew() {
    setEdit(null);
    setOpen(true);
  }

  function openEdit(v) {
    setEdit(v);
    setOpen(true);
  }

  async function onSave(data) {
    try {
      const id = getVehicleId(edit);
      if (id) {
        await updateVehiculo(id, data);
        toast.success("Vehículo actualizado correctamente.");
      } else {
        await registerVehiculo(data);
        toast.success("Vehículo creado correctamente.");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.message || "No se pudo guardar el vehículo.");
    }
  }

  function onDelete(id) {
    toast.confirm("¿Eliminar este vehículo?", {
      label: "Eliminar",
      onConfirm: async () => {
        try {
          await deleteVehiculo(id);
          toast.success("Vehículo eliminado correctamente.");
          await load();
        } catch (e) {
          toast.error(e?.message || "No se pudo eliminar el vehículo.");
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
              Vehículos
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Gestioná tus vehículos registrados
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
             Tenés {count} {count === 1 ? "vehículo registrado" : "vehículos registrados"}
            </div>

            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
            >
              <Plus className="h-5 w-5" />
              Nuevo vehículo
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-500 shadow-sm">
          Cargando vehículos...
        </div>
      ) : vehiculos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 shadow-sm">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
              <Car className="h-7 w-7 text-slate-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              No tenés vehículos cargados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Creá tu primer vehículo para empezar a gestionarlo desde esta sección.
            </p>
            <button
              onClick={openNew}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
            >
              <Plus className="h-5 w-5" />
              Nuevo vehículo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {vehiculos.map((v) => {
            const vid = getVehicleId(v);
            const titulo =
              v.nombre || `${v.marca || ""} ${v.modelo || ""}`.trim() || "Vehículo";

            return (
              <Card
                key={vid}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-start gap-4 p-5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50">
                      <Car className="h-6 w-6 text-blue-700" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-extrabold text-slate-800">
                            {titulo}
                          </h2>

                          <p className="text-sm font-medium text-slate-500">
                            {(v.marca || "—") + " · " + (v.modelo || "—")}
                          </p>
                        </div>

                        <span className="inline-flex w-fit shrink-0 rounded-full bg-blue-50 px-3 py-1 text-lg font-extrabold tracking-wide text-blue-700">
                          {v.patente || "—"} 
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {v.adicionales ? v.adicionales : "Sin datos adicionales"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                    <IconBtn title="Editar" onClick={() => openEdit(v)}>
                      <Pencil className="h-4 w-4 text-blue-700" />
                    </IconBtn>

                    <IconBtn title="Eliminar" onClick={() => onDelete(vid)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </IconBtn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <VehiculoModal
        open={open}
        initial={edit}
        onClose={() => setOpen(false)}
        onSave={onSave}
      />
    </div>
  );
}

function IconBtn({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100"
    >
      {children}
    </button>
  );
}