import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  UserRound,
  Phone,
  MapPin,
  IdCard,
  Building2,
} from "lucide-react";
import Loader from "../../components/Loader";
import {
  getDestinatarios,
  addDestinatario,
  deleteDestinatario,
} from "../../services/profileService/profileService";
import {
  getProvinciasAR,
  getLocalidadesByProvincia,
} from "../../services/geoService";

function formatDNI(dni) {
  if (!dni) return "";
  const clean = String(dni).replace(/\D/g, "");
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function DestinatariosFrecuentes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState([]);

  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  const [form, setForm] = useState({
    alias: "",
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
    direccion: "",
    pisoDepartamento: "",
    provinciaId: "",
    provincia: "",
    ciudadId: "",
    ciudad: "",
    cp: "",
    referencia: "",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [destinatariosData, provinciasData] = await Promise.all([
          getDestinatarios(),
          getProvinciasAR(),
        ]);

        if (!alive) return;

        setList(Array.isArray(destinatariosData) ? destinatariosData : []);
        setProvincias(Array.isArray(provinciasData) ? provinciasData : []);
      } catch (err) {
        if (!alive) return;
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "No se pudieron cargar los destinatarios."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  function getOptionName(obj) {
    return obj?.nombre || obj?.name || obj?.label || "";
  }

  function getOptionId(obj) {
    return obj?.id ?? obj?._id ?? obj?.value ?? "";
  }

  async function handleProvinciaChange(e) {
    const provinciaId = e.target.value;
    const provinciaObj = provincias.find(
      (p) => String(getOptionId(p)) === String(provinciaId)
    );

    setForm((prev) => ({
      ...prev,
      provinciaId,
      provincia: getOptionName(provinciaObj),
      ciudadId: "",
      ciudad: "",
    }));

    if (!provinciaId) {
      setLocalidades([]);
      return;
    }

    try {
      const data = await getLocalidadesByProvincia(provinciaId);
      setLocalidades(Array.isArray(data) ? data : []);
    } catch {
      setLocalidades([]);
    }
  }

  function handleCiudadChange(e) {
    const ciudadId = e.target.value;
    const ciudadObj = localidades.find(
      (l) => String(getOptionId(l)) === String(ciudadId)
    );

    setForm((prev) => ({
      ...prev,
      ciudadId,
      ciudad: getOptionName(ciudadObj),
    }));
  }

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "telefono") {
      const clean = value.replace(/\D/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: clean }));
      return;
    }

    if (name === "dni") {
      const clean = value.replace(/\D/g, "").slice(0, 8);
      setForm((prev) => ({ ...prev, [name]: clean }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");

    if (!form.alias.trim() || !form.nombre.trim() || !form.apellido.trim()) {
      setError("Alias, nombre y apellido son obligatorios.");
      return;
    }

    if (!form.provinciaId || !form.ciudadId) {
      setError("Debés seleccionar provincia y ciudad.");
      return;
    }

    if (form.telefono && form.telefono.length !== 10) {
      setError("El teléfono debe tener 10 dígitos.");
      return;
    }

    try {
      setSaving(true);

      const created = await addDestinatario({
        alias: form.alias.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni.replace(/\D/g, ""),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        pisoDepartamento: form.pisoDepartamento.trim(),
        provincia: {
          provinciaId: form.provinciaId,
          provinciaNombre: form.provincia,
        },
        localidad: {
          localidadId: form.ciudadId,
          localidadNombre: form.ciudad,
        },
        cp: form.cp.trim(),
        referencia: form.referencia.trim(),
      });

      setList((prev) => [created, ...prev]);

      setForm({
        alias: "",
        nombre: "",
        apellido: "",
        dni: "",
        telefono: "",
        direccion: "",
        pisoDepartamento: "",
        provinciaId: "",
        provincia: "",
        ciudadId: "",
        ciudad: "",
        cp: "",
        referencia: "",
      });
      setLocalidades([]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "No se pudo guardar el destinatario."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteDestinatario(id);
      setList((prev) =>
        prev.filter((item) => String(item.id || item._id) !== String(id))
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "No se pudo eliminar el destinatario."
      );
    }
  }

  // FIX: leer exclusivamente desde la estructura anidada normalizada.
  // Nunca caer a item.provincia / item.ciudad (strings planos) porque
  // el backend puede devolver ambos campos y se mostraría duplicado.
  function getProvinciaNombre(item) {
    return item?.provincia?.provinciaNombre ?? "";
  }

  function getCiudadNombre(item) {
    return item?.localidad?.localidadNombre ?? "";
  }

  if (loading) return <Loader />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
          Destinatarios frecuentes
        </h1>
        <div className="mt-4 h-px w-full bg-slate-200" />
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-bold text-slate-800">
              Agregar destinatario
            </h2>
          </div>

          <form
            onSubmit={handleAdd}
            className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <Input
              label="Alias"
              name="alias"
              value={form.alias}
              onChange={handleChange}
            />
            <Input
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
            />
            <Input
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
            />
            <Input
              label="DNI"
              name="dni"
              value={formatDNI(form.dni)}
              onChange={handleChange}
            />
            <Input
              label="Teléfono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
            />

            <Input
              label="Dirección"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              className="md:col-span-2"
            />

            <Input
              label="Piso / Departamento"
              name="pisoDepartamento"
              value={form.pisoDepartamento}
              onChange={handleChange}
              placeholder="Ej: 3° B"
            />

            <Select
              label="Provincia"
              value={form.provinciaId}
              onChange={handleProvinciaChange}
            >
              <option value="">Seleccionar provincia</option>
              {provincias.map((prov) => (
                <option key={getOptionId(prov)} value={getOptionId(prov)}>
                  {getOptionName(prov)}
                </option>
              ))}
            </Select>

            <Select
              label="Ciudad / Localidad"
              value={form.ciudadId}
              onChange={handleCiudadChange}
              disabled={!form.provinciaId}
            >
              <option value="">Seleccionar ciudad</option>
              {localidades.map((loc) => (
                <option key={getOptionId(loc)} value={getOptionId(loc)}>
                  {getOptionName(loc)}
                </option>
              ))}
            </Select>

            <Input
              label="Código postal"
              name="cp"
              value={form.cp}
              onChange={handleChange}
            />

            <Textarea
              label="Referencia"
              name="referencia"
              value={form.referencia}
              onChange={handleChange}
              className="md:col-span-2"
              placeholder="Ej: portón negro, casa esquina, timbre roto, etc."
            />

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar destinatario"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">
            Mis destinatarios
          </h2>

          <div className="mt-6 space-y-4">
            {list.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todavía no tenés destinatarios guardados.
              </p>
            ) : (
              list.map((item) => (
                <div
                  key={item.id || item._id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-800">
                        <UserRound className="h-4 w-4 text-blue-700" />
                        <span className="font-semibold">
                          {item.alias} — {item.nombre} {item.apellido}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <IdCard className="h-4 w-4 text-blue-700" />
                        <span>{formatDNI(item.dni)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4 text-blue-700" />
                        <span>{item.telefono || "—"}</span>
                      </div>

                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin className="mt-0.5 h-4 w-4 text-blue-700" />
                        <span>
                          {[
                            item.direccion,
                            getCiudadNombre(item),
                            getProvinciaNombre(item),
                            item.cp,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>

                      {item.pisoDepartamento ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building2 className="h-4 w-4 text-blue-700" />
                          <span>
                            Piso / Departamento: {item.pisoDepartamento}
                          </span>
                        </div>
                      ) : null}

                      {item.referencia ? (
                        <div className="text-sm text-slate-500">
                          Referencia: {item.referencia}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id || item._id)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Input({ label, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function Textarea({ label, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <textarea
        {...props}
        className="min-h-[110px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function Select({ label, className = "", children, ...props }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <select
        {...props}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
      >
        {children}
      </select>
    </div>
  );
}
