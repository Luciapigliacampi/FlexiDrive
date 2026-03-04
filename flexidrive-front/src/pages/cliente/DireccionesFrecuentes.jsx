// flexidrive-front/src/pages/cliente/DireccionesFrecuentes.jsx
import { useEffect, useState } from "react";
import { Card, Input, Button } from "../../components/UI";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";

import { getDirecciones, addDireccion, deleteDireccion } from "../../services/profileService";
import { getProvinciasAR, getLocalidadesByProvincia } from "../../services/geoService";
import { getAddressSuggestions, getPlaceDetails } from "../../services/mapsService";

export default function DireccionesFrecuentes() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  // GEO
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  // Autocomplete Google
  const [query, setQuery] = useState("");
  const [sug, setSug] = useState([]);
  const [geo, setGeo] = useState({ placeId: "", lat: null, lng: null, texto: "" });

  const [form, setForm] = useState({
    alias: "",
    direccion: "",
    provinciaId: "",
    localidadId: "",
    cp: "",
  });

  // Helpers nombres
  const provinciaNombreById = (id) => provincias.find((p) => p.id === id)?.nombre || "";
  const localidadNombreById = (id) => localidades.find((l) => l.id === id)?.nombre || "";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getDirecciones();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getApiErrorMessage(e, "No se pudieron cargar tus direcciones."));
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  // Load provincias
  useEffect(() => {
    (async () => {
      try {
        const provs = await getProvinciasAR();
        setProvincias(Array.isArray(provs) ? provs : []);
      } catch (e) {
        setError(getApiErrorMessage(e, "No se pudieron cargar provincias."));
      }
    })();
  }, []);

  // Load direcciones
  useEffect(() => { load(); }, []); // eslint-disable-line

  // Debounce autocomplete
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        if (!query.trim()) return setSug([]);
        const res = await getAddressSuggestions(query);
        setSug(Array.isArray(res) ? res : []);
      } catch {
        setSug([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function pickSuggestion(s) {
    const coords = await getPlaceDetails(s.place_id);
    setGeo({
      placeId: s.place_id,
      texto: s.description,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });
    setForm((p) => ({ ...p, direccion: s.description }));
    setQuery(s.description);
    setSug([]);
  }

  async function loadLocalidades(provId) {
    setLocalidades([]);
    if (!provId) return;
    try {
      const locs = await getLocalidadesByProvincia(provId);
      setLocalidades(Array.isArray(locs) ? locs : []);
    } catch (e) {
      setError(getApiErrorMessage(e, "No se pudieron cargar localidades."));
    }
  }

  function onChange(e) {
    const { name, value } = e.target;

    if (name === "provinciaId") {
      setForm((p) => ({ ...p, provinciaId: value, localidadId: "" }));
      loadLocalidades(value);
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  }

  function validate() {
    if (!form.alias.trim()) return "Completá el alias.";
    if (!form.direccion.trim()) return "Completá la dirección.";
    if (!form.provinciaId) return "Seleccioná la provincia.";
    if (!form.localidadId) return "Seleccioná la localidad.";
    if (!form.cp.trim()) return "Completá el código postal.";
    if (!geo.placeId || geo.lat == null || geo.lng == null) {
      return "Elegí una sugerencia de Google para guardar las coordenadas.";
    }
    return "";
  }

  async function add() {
    const msg = validate();
    if (msg) { setError(msg); return; }

    setLoading(true);
    setError("");

    const payload = {
      alias: form.alias.trim(),
      direccion: form.direccion.trim(),

      // ✅ objetos como en SolicitarEnvio
      provincia: {
        provinciaId: form.provinciaId,
        provinciaNombre: provinciaNombreById(form.provinciaId),
      },
      localidad: {
        localidadId: form.localidadId,
        localidadNombre: localidadNombreById(form.localidadId),
      },

      cp: form.cp.trim(),
      placeId: geo.placeId,
      lat: geo.lat,
      lng: geo.lng,
    };

    try {
      await addDireccion(payload);

      // reset
      setForm({ alias: "", direccion: "", provinciaId: "", localidadId: "", cp: "" });
      setQuery("");
      setSug([]);
      setGeo({ placeId: "", lat: null, lng: null, texto: "" });
      setLocalidades([]);

      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, "No se pudo guardar la dirección."));
    } finally {
      setLoading(false);
    }
  }

  async function del(id) {
    setLoading(true);
    setError("");
    try {
      await deleteDireccion(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, "No se pudo eliminar la dirección."));
    } finally {
      setLoading(false);
    }
  }

  // Render helpers por compatibilidad (si vienen strings u objetos)
  const renderId = (d) => d?._id ?? d?.id;
  const renderCiudad = (d) => d?.localidad?.localidadNombre ?? d?.ciudad ?? "";
  const renderProvincia = (d) => d?.provincia?.provinciaNombre ?? d?.provincia ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">Direcciones frecuentes</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 whitespace-pre-line">
          {error}
        </div>
      )}

      <Card title="Agregar nueva">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            name="alias"
            value={form.alias}
            onChange={onChange}
            placeholder="Alias (Casa, Trabajo...)"
          />

          {/* Dirección + Autocomplete */}
          <div className="relative md:col-span-2">
            <Input
              name="direccion"
              value={form.direccion}
              onChange={(e) => {
                onChange(e);
                setQuery(e.target.value);
                // si modifica a mano, invalida geo hasta que elija sugerencia
                setGeo({ placeId: "", lat: null, lng: null, texto: "" });
              }}
              placeholder="Dirección (calle y número)"
            />

            {sug.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow max-h-64 overflow-auto">
                {sug.map((s) => (
                  <button
                    type="button"
                    key={s.place_id}
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                  >
                    {s.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Provincia -> Localidad */}
          <select
            name="provinciaId"
            value={form.provinciaId}
            onChange={onChange}
            className="w-full rounded-lg border px-4 py-2 outline-none text-slate-700 bg-white"
          >
            <option value="">Provincia</option>
            {provincias.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          <select
            name="localidadId"
            value={form.localidadId}
            onChange={onChange}
            className="w-full rounded-lg border px-4 py-2 outline-none text-slate-700 bg-white"
          >
            <option value="">
              {form.provinciaId ? "Localidad" : "Elegí provincia primero"}
            </option>
            {localidades.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>

          <Input
            name="cp"
            value={form.cp}
            onChange={onChange}
            placeholder="Código postal"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={add} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </Card>

      {loading ? <Loader /> : list.length === 0 ? (
        <EmptyState
          title="No tenés direcciones guardadas"
          subtitle="Agregá una para pedir envíos más rápido."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((d) => (
            <Card key={renderId(d)} title={d.alias}>
              <div className="text-slate-700 font-semibold">{d.direccion}</div>
              <div className="text-slate-500">
                {renderCiudad(d)}, {renderProvincia(d)} {d.cp}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => del(renderId(d))}>
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function getApiErrorMessage(err, fallback = "Ocurrió un error.") {
  const data = err?.response?.data;
  if (Array.isArray(data?.detalles) && data.detalles.length > 0) {
    return data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join("\n");
  }
  return data?.error || data?.message || err?.message || fallback;
}