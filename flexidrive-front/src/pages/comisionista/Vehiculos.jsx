// flexidrive-front/src/pages/comisionista/Vehiculos.jsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Car } from "lucide-react";
import { Card } from "../../components/UI";
import { getMyVehicles, registerVehiculo, updateVehiculo, deleteVehiculo } from "../../services/authService";
import VehiculoModal from "./VehiculoModal";

// FIX #7: helper para obtener el id de un vehículo de forma consistente
function getVehicleId(v) {
  return v?._id ?? v?.id ?? "";
}

export default function Vehiculos() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vehiculos, setVehiculos] = useState([]);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);

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
      // FIX #7: usar getVehicleId en lugar de edit?._id directamente
      const id = getVehicleId(edit);
      if (id) {
        await updateVehiculo(id, data);
      } else {
        await registerVehiculo(data);
      }
      setOpen(false);
      await load();
    } catch (e) {
      alert(e?.message || "No se pudo guardar el vehículo.");
    }
  }

  async function onDelete(id) {
    const ok = confirm("¿Eliminar este vehículo?");
    if (!ok) return;

    try {
      await deleteVehiculo(id);
      await load();
    } catch (e) {
      alert(e?.message || "No se pudo eliminar el vehículo.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Vehículos</h1>
          <p className="text-slate-600 font-semibold">Gestioná tus vehículos ({count})</p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-700 text-white font-bold hover:bg-blue-800"
        >
          <Plus className="h-5 w-5" />
          Nuevo vehículo
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="rounded-xl border bg-white p-6 text-slate-500">Cargando vehículos...</div>
        ) : vehiculos.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-slate-500">
            No tenés vehículos cargados. Creá uno con "Nuevo vehículo".
          </div>
        ) : (
          vehiculos.map((v) => {
            // FIX #7: key y onDelete usan getVehicleId
            const vid = getVehicleId(v);
            return (
              <Card key={vid} className="p-0 overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 grid place-items-center">
                      <Car className="h-5 w-5 text-slate-700" />
                    </div>

                    <div className="space-y-1">
                      <div className="text-lg font-extrabold text-slate-800">
                        {v.nombre || `${v.marca || ""} ${v.modelo || ""}`.trim() || "Vehículo"}
                      </div>

                      <div className="text-sm text-slate-600 font-semibold">
                        {(v.marca || "—") + " · " + (v.modelo || "—")}{" "}
                        <span className="text-slate-400">|</span> Patente:{" "}
                        <span className="font-extrabold text-blue-700">{v.patente || "—"}</span>
                      </div>

                      {v.adicionales ? (
                        <div className="text-sm text-slate-600">{v.adicionales}</div>
                      ) : (
                        <div className="text-xs text-slate-400">Sin datos adicionales</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <IconBtn title="Editar" onClick={() => openEdit(v)}>
                      <Pencil className="h-4 w-4 text-blue-700" />
                    </IconBtn>
                    {/* FIX #7: pasar vid (normalizado) en lugar de v._id */}
                    <IconBtn title="Eliminar" onClick={() => onDelete(vid)}>
                      <Trash2 className="h-4 w-4 text-blue-700" />
                    </IconBtn>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal */}
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
      className="h-9 w-9 rounded-md hover:bg-slate-100 grid place-items-center"
    >
      {children}
    </button>
  );
}
