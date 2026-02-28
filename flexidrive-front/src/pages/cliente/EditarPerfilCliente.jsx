//flexidrive-front\src\pages\cliente\EditarPerfilCliente.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Input, Button } from "../../components/UI";
import Loader from "../../components/Loader";
import { getProfile, updateProfile } from "../../services/profileMock";

export default function EditarPerfilCliente() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const p = await getProfile();
      setForm(p);
      setLoading(false);
    })();
  }, []);

  function onChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function guardar() {
    setLoading(true);
    await updateProfile(form);
    setLoading(false);
    navigate("/cliente/perfil");
  }

  if (loading && !form) return <Loader />;
  if (!form) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">Editar perfil</h1>

      <Card title="Datos">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input name="nombre" value={form.nombre} onChange={onChange} placeholder="Nombre" />
          <Input name="apellido" value={form.apellido} onChange={onChange} placeholder="Apellido" />
          <Input name="email" value={form.email} onChange={onChange} placeholder="Email" />
          <Input name="telefono" value={form.telefono} onChange={onChange} placeholder="Teléfono" />
          <Input name="ciudad" value={form.ciudad} onChange={onChange} placeholder="Ciudad" />
          <Input name="provincia" value={form.provincia} onChange={onChange} placeholder="Provincia" />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={guardar} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
        </div>
      </Card>
    </div>
  );
}
