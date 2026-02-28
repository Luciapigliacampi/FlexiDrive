//flexidrive-front\src\pages\cliente\DireccionesFrecuentes.jsx
import { useEffect, useState } from "react";
import { Card, Input, Button } from "../../components/UI";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { getDirecciones, addDireccion, deleteDireccion } from "../../services/profileService";

export default function DireccionesFrecuentes() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ alias: "", direccion: "", ciudad: "", provincia: "", cp: "" });

  async function load() {
    setLoading(true);
    const data = await getDirecciones();
    setList(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function onChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function add() {
    if (!form.alias || !form.direccion) return;
    setLoading(true);
    await addDireccion(form);
    setForm({ alias: "", direccion: "", ciudad: "", provincia: "", cp: "" });
    await load();
  }

  async function del(id) {
    setLoading(true);
    await deleteDireccion(id);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">Direcciones frecuentes</h1>

      <Card title="Agregar nueva">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input name="alias" value={form.alias} onChange={onChange} placeholder="Alias (Casa, Trabajo...)" />
          <Input name="direccion" value={form.direccion} onChange={onChange} placeholder="Dirección" />
          <Input name="ciudad" value={form.ciudad} onChange={onChange} placeholder="Ciudad" />
          <Input name="provincia" value={form.provincia} onChange={onChange} placeholder="Provincia" />
          <Input name="cp" value={form.cp} onChange={onChange} placeholder="Código postal" />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={add} disabled={loading}>Guardar</Button>
        </div>
      </Card>

      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState title="No tenés direcciones guardadas" subtitle="Agregá una para pedir envíos más rápido." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((d) => (
            <Card key={d.id} title={d.alias}>
              <div className="text-slate-700 font-semibold">{d.direccion}</div>
              <div className="text-slate-500">{d.ciudad}, {d.provincia} {d.cp}</div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => del(d.id)}>Eliminar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
