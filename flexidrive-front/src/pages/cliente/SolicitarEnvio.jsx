//flexidrive-front\src\pages\cliente\SolicitarEnvio.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import heroImg from "../../assets/boxes.png";
import {
  MapPin, Package, NotepadText, Calendar1, Trash2, X, CheckCircle2,
} from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es";

import { getAddressSuggestions, getPlaceDetails } from "../../services/mapsService";
import { Card, Input, Button } from "../../components/UI";
import {
  getDirecciones, addDireccion, getDestinatarios, addDestinatario,
} from "../../services/profileService";
import { getProvinciasAR, getLocalidadesByProvincia } from "../../services/geoService";

registerLocale("es", es);

// ✅ Franjas horarias en lugar de horas fijas
const FRANJAS_HORARIAS = [
  { value: "08:00-10:00", label: "08:00 a 10:00" },
  { value: "10:00-12:00", label: "10:00 a 12:00" },
  { value: "12:00-14:00", label: "12:00 a 14:00" },
  { value: "14:00-16:00", label: "14:00 a 16:00" },
  { value: "16:00-18:00", label: "16:00 a 18:00" },
  { value: "18:00-20:00", label: "18:00 a 20:00" },
];

const tiposPaquete = [
  { value: "clasico", label: "Clásico" },
  { value: "fragil", label: "Frágil" },
];



export default function SolicitarEnvio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // GEO
  const [provincias, setProvincias] = useState([]);
  const [localidadesOrigen, setLocalidadesOrigen] = useState([]);
  const [localidadesDestino, setLocalidadesDestino] = useState([]);
  const [localidadesOrigenModal, setLocalidadesOrigenModal] = useState([]);
  const [localidadesDestinoModal, setLocalidadesDestinoModal] = useState([]);

  // Maps autocomplete
  const [origenQuery, setOrigenQuery] = useState("");
  const [origenSug, setOrigenSug] = useState([]);
  const [origenGeo, setOrigenGeo] = useState({ placeId: "", lat: null, lng: null, texto: "" });

  const [destinoQuery, setDestinoQuery] = useState("");
  const [destinoSug, setDestinoSug] = useState([]);
  const [destinoGeo, setDestinoGeo] = useState({ placeId: "", lat: null, lng: null, texto: "" });

  const [direccionesRetiro, setDireccionesRetiro] = useState([
    { value: "otra", label: "Otra dirección..." },
  ]);
  const [clientesGuardados, setClientesGuardados] = useState([
    { id: "nuevo", label: "Nuevo destinatario..." },
  ]);

  const [form, setForm] = useState({
    // Origen
    origen: "",
    origenDireccion: "",
    origenLocalidad: "",
    origenProvincia: "",
    origenCP: "",
    // ✅ Franja horaria de disponibilidad para retiro (elige el cliente)
    franjaHorariaRetiro: "",

    // Destino
    destinatarioId: "",
    apellido: "",
    nombre: "",
    dni: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    cp: "",
    // ✅ Fecha de entrega: solo fecha sin hora (la elige el cliente)
    fechaEntrega: getTodayISO(),

    // Paquetes
    paquetes: [{ tipoPaquete: "", alto: "", ancho: "", profundidad: "", peso: "" }],
    notas: "",
  });

  // Modales
  const [openOrigenModal, setOpenOrigenModal] = useState(false);
  const [origenModalStep, setOrigenModalStep] = useState("form");
  const [lastSavedAlias, setLastSavedAlias] = useState("");
  const [origenModalForm, setOrigenModalForm] = useState({
    alias: "", direccion: "", ciudad: "", provincia: "", cp: "",
  });

  const [openDestinoModal, setOpenDestinoModal] = useState(false);
  const [destinoModalStep, setDestinoModalStep] = useState("form");
  const [lastSavedClienteNombre, setLastSavedClienteNombre] = useState("");
  const [destinoModalForm, setDestinoModalForm] = useState({
    apellido: "", nombre: "", dni: "", telefono: "",
    direccion: "", ciudad: "", provincia: "", cp: "",
  });

  // ─── Helpers GEO ───
  const provinciaNombreById = (id) => provincias.find((p) => p.id === id)?.nombre || "";
  const localidadNombreById = (list, id) => list.find((l) => l.id === id)?.nombre || "";

  const [origenModalError, setOrigenModalError] = useState("");
const [destinoModalError, setDestinoModalError] = useState("");

  function mapDireccionesToOptions(dirs) {
    const mapped = (Array.isArray(dirs) ? dirs : []).map((d) => ({
      value: d._id || d.id,
      label: `${d.alias} - ${d.direccion}, ${d.ciudad}`,
      direccion: d.direccion,
      localidad: d.ciudad,
      provincia: d.provincia,
      cp: d.cp,
      alias: d.alias,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      placeId: d.placeId ?? "",
    }));
    return [...mapped, { value: "otra", label: "Otra dirección..." }];
  }

  function mapDestinatariosToOptions(dests) {
    const mapped = (Array.isArray(dests) ? dests : []).map((c) => {
      const id = c._id || c.id;
      const fullName = `${c.apellido} ${c.nombre}`.trim();
      return {
        id,
        label: `${fullName} (DNI ${c.dni}) - ${c.direccion}, ${c.ciudad}`,
        apellido: c.apellido, nombre: c.nombre, dni: c.dni, telefono: c.telefono,
        direccion: c.direccion, ciudad: c.ciudad, provincia: c.provincia, cp: c.cp,
        lat: c.lat ?? null, lng: c.lng ?? null, placeId: c.placeId ?? "",
      };
    });
    return [...mapped, { id: "nuevo", label: "Nuevo destinatario..." }];
  }

  async function refreshDirecciones() {
    const raw = await getDirecciones();
    const dirs = Array.isArray(raw) ? raw : raw?.direcciones || raw?.data || [];
    const opts = mapDireccionesToOptions(dirs);
    setDireccionesRetiro(opts);
    return opts;
  }

  async function refreshDestinatarios() {
    const raw = await getDestinatarios();
    const dests = Array.isArray(raw) ? raw : raw?.destinatarios || raw?.data || [];
    const opts = mapDestinatariosToOptions(dests);
    setClientesGuardados(opts);
    return opts;
  }

  async function loadLists() {
    try {
      setError("");
      await Promise.all([refreshDirecciones(), refreshDestinatarios()]);
    } catch (e) {
      setError(getApiErrorMessage(e, "No se pudieron cargar direcciones/destinatarios."));
      setDireccionesRetiro([{ value: "otra", label: "Otra dirección..." }]);
      setClientesGuardados([{ id: "nuevo", label: "Nuevo destinatario..." }]);
    }
  }

  // ─── Autocomplete ───
  useEffect(() => {
    const t = setTimeout(async () => {
      try { setOrigenSug(await getAddressSuggestions(origenQuery)); }
      catch { setOrigenSug([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [origenQuery]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try { setDestinoSug(await getAddressSuggestions(destinoQuery)); }
      catch { setDestinoSug([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [destinoQuery]);

  async function pickOrigenSuggestion(s) {
    const coords = await getPlaceDetails(s.place_id);
    setOrigenGeo({ placeId: s.place_id, texto: s.description, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
    setForm((p) => ({ ...p, origenDireccion: s.description }));
    setOrigenQuery(s.description);
    setOrigenSug([]);
  }

  async function pickDestinoSuggestion(s) {
    const coords = await getPlaceDetails(s.place_id);
    setDestinoGeo({ placeId: s.place_id, texto: s.description, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
    setForm((p) => ({ ...p, direccion: s.description }));
    setDestinoQuery(s.description);
    setDestinoSug([]);
  }

  // ─── Load inicial ───
  useEffect(() => {
    (async () => {
      try { setProvincias(await getProvinciasAR()); }
      catch (e) { setError(getApiErrorMessage(e, "No se pudieron cargar provincias.")); }
    })();
  }, []);

  useEffect(() => { loadLists(); }, []); // eslint-disable-line

  async function loadLocalidades(setter, provId) {
    setter([]);
    if (!provId) return;
    try { setter(await getLocalidadesByProvincia(provId)); }
    catch (e) { setError(getApiErrorMessage(e, "No se pudieron cargar localidades.")); }
  }

  // ─── onChange ───
  function onChange(e) {
    const { name, value } = e.target;

    if (name === "origen") {
      const opt = direccionesRetiro.find((d) => d.value === value);
      if (value !== "otra") {
        setForm((p) => ({ ...p, origen: value, origenDireccion: "", origenLocalidad: "", origenProvincia: "", origenCP: "" }));
        setLocalidadesOrigen([]);
        // Usar coords guardadas si existen
        setOrigenGeo(opt?.lat != null
          ? { placeId: opt.placeId || "", lat: opt.lat, lng: opt.lng, texto: opt.direccion || "" }
          : { placeId: "", lat: null, lng: null, texto: "" });
      } else {
        setForm((p) => ({ ...p, origen: value }));
        setOrigenGeo({ placeId: "", lat: null, lng: null, texto: "" });
      }
      return;
    }

    if (name === "origenProvincia") {
      setForm((p) => ({ ...p, origenProvincia: value, origenLocalidad: "" }));
      loadLocalidades(setLocalidadesOrigen, value);
      return;
    }

    if (name === "provincia") {
      setForm((p) => ({ ...p, provincia: value, ciudad: "" }));
      loadLocalidades(setLocalidadesDestino, value);
      return;
    }

    if (name === "destinatarioId") {
      const sel = clientesGuardados.find((c) => c.id === value);
      if (!sel || sel.id === "nuevo") {
        setForm((p) => ({
          ...p, destinatarioId: value,
          apellido: "", nombre: "", dni: "", telefono: "",
          direccion: "", ciudad: "", provincia: "", cp: "",
        }));
        setLocalidadesDestino([]);
        setDestinoQuery("");
        setDestinoSug([]);
        setDestinoGeo({ placeId: "", lat: null, lng: null, texto: "" });
        return;
      }
      setForm((p) => ({
        ...p, destinatarioId: value,
        apellido: sel.apellido || "", nombre: sel.nombre || "",
        dni: sel.dni || "", telefono: sel.telefono || "",
        direccion: sel.direccion || "", ciudad: sel.ciudad || "",
        provincia: sel.provincia || "", cp: sel.cp || "",
      }));
      setDestinoGeo(sel.lat != null
        ? { placeId: sel.placeId || "", lat: sel.lat, lng: sel.lng, texto: sel.direccion || "" }
        : { placeId: "", lat: null, lng: null, texto: "" });
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  }

  function addPaquete() {
    setForm((p) => ({
      ...p, paquetes: [...p.paquetes, { tipoPaquete: "", alto: "", ancho: "", profundidad: "", peso: "" }],
    }));
  }
  function onChangePaquete(index, e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, paquetes: p.paquetes.map((paq, i) => (i === index ? { ...paq, [name]: value } : paq)) }));
  }
  function removePaquete(index) {
    setForm((p) => {
      if (p.paquetes.length <= 1) return p;
      return { ...p, paquetes: p.paquetes.filter((_, i) => i !== index) };
    });
  }

  // ─── Helpers texto/datos ───
  function getOrigenData() {
    if (form.origen === "otra") {
      return {
        direccion: form.origenDireccion.trim(),
        localidad: localidadNombreById(localidadesOrigen, form.origenLocalidad),
        provincia: provinciaNombreById(form.origenProvincia),
        cp: form.origenCP.trim(),
      };
    }
    const opt = direccionesRetiro.find((d) => d.value === form.origen);
    return {
      direccion: opt?.direccion || "",
      localidad: opt?.localidad || "",
      provincia: opt?.provincia || "",
      cp: opt?.cp || "",
    };
  }

  function getOrigenTexto() {
    const o = getOrigenData();
    return [o.direccion, o.localidad, o.provincia].filter(Boolean).join(", ");
  }

  function getDestinoTexto() {
    if (form.destinatarioId && form.destinatarioId !== "nuevo") {
      const sel = clientesGuardados.find((c) => c.id === form.destinatarioId);
      if (sel) return [sel.direccion, sel.ciudad, sel.provincia].filter(Boolean).join(", ");
      return "";
    }
    const dir = form.direccion.trim();
    const loc = localidadNombreById(localidadesDestino, form.ciudad);
    const prov = provinciaNombreById(form.provincia);
    if (!dir || !loc || !prov) return "";
    return [dir, loc, prov].join(", ");
  }

  // ─── Validaciones ───
  function validateDestino() {
    const eligioGuardado = !!form.destinatarioId && form.destinatarioId !== "nuevo";
    if (eligioGuardado) return "";

    if (!form.destinatarioId || form.destinatarioId !== "nuevo") {
      return "Seleccioná un destinatario o elegí Nuevo destinatario….";
    }
    if (!form.direccion.trim()) return "Completá la dirección de envío.";
    if (!form.provincia) return "Seleccioná la provincia.";
    if (!form.ciudad) return "Seleccioná la localidad.";
    if (!form.cp.trim()) return "Completá el código postal.";
    if (destinoGeo.lat == null || destinoGeo.lng == null) {
      return "Elegí una sugerencia de dirección para confirmar la ubicación del DESTINO.";
    }
    if (!form.apellido.trim()) return "Completá el apellido del destinatario.";
    if (!form.nombre.trim()) return "Completá el nombre del destinatario.";
    if (!form.dni.trim()) return "Completá el DNI del destinatario.";
    if (!/^\d{7,8}$/.test(form.dni.trim())) return "DNI inválido (7 u 8 dígitos).";
    if (!form.telefono.trim()) return "Completá el teléfono del destinatario.";
    if (!/^[\d+\s()-]{6,20}$/.test(form.telefono.trim())) return "Teléfono inválido.";
    return "";
  }

  function validateBeforeSubmit() {
    if (!form.origen) return "Elegí una dirección de retiro.";

    if (form.origen === "otra") {
      if (!form.origenDireccion.trim()) return "Completá la dirección de retiro.";
      if (!form.origenProvincia) return "Seleccioná la provincia de retiro.";
      if (!form.origenLocalidad) return "Seleccioná la localidad de retiro.";
      if (!form.origenCP.trim()) return "Completá el código postal de retiro.";
      if (origenGeo.lat == null || origenGeo.lng == null) {
        return "Elegí una sugerencia de dirección para confirmar la ubicación del ORIGEN.";
      }
    } else {
      const o = getOrigenData();
      if (!o.localidad) return "La dirección de retiro seleccionada no tiene localidad.";
    }

    // ✅ Franja horaria obligatoria
    if (!form.franjaHorariaRetiro) return "Seleccioná una franja horaria de disponibilidad para el retiro.";

    // ✅ Fecha de entrega obligatoria
    if (!form.fechaEntrega) return "Seleccioná la fecha de entrega.";

    const destinoMsg = validateDestino();
    if (destinoMsg) return destinoMsg;

    if (!form.paquetes?.length) return "Debes incluir al menos un paquete.";
    for (const [i, p] of form.paquetes.entries()) {
      if (!p.tipoPaquete) return `Seleccioná el tipo de paquete (Paquete #${i + 1}).`;
      if (!p.alto || !p.ancho || !p.profundidad) return `Completá dimensiones (Paquete #${i + 1}).`;
      if (!p.peso) return `Completá el peso (Paquete #${i + 1}).`;
    }
    return "";
  }

  // ─── Payload ───
  function buildCrearEnvioPayloadBase() {
        const origenCiudad =
      form.origen === "otra"
        ? localidadNombreById(localidadesOrigen, form.origenLocalidad)
        : direccionesRetiro.find((d) => d.value === form.origen)?.localidad || "";

    const destinoCiudad =
      form.destinatarioId && form.destinatarioId !== "nuevo"
        ? clientesGuardados.find((c) => c.id === form.destinatarioId)?.ciudad || ""
        : localidadNombreById(localidadesDestino, form.ciudad);

    return {
      direccion_origen: {
        texto: getOrigenTexto(),
        lat: origenGeo.lat ?? 0,
        lng: origenGeo.lng ?? 0,
      },
      direccion_destino: {
        texto: getDestinoTexto(),
        lat: destinoGeo.lat ?? 0,
        lng: destinoGeo.lng ?? 0,
      },
      origenCiudad,
      destinoCiudad,
      // ✅ fecha_entrega: solo fecha, sin hora
      fecha_entrega: form.fechaEntrega,
      // ✅ franja_horaria_retiro: ventana elegida por el cliente
      franja_horaria_retiro: form.franjaHorariaRetiro,
      // fecha_retiro NO se incluye: la decide el comisionista
      notas_adicionales: form.notas.trim(),
      paquetes: form.paquetes.map((p) => ({
        alto: num(p.alto),
        ancho: num(p.ancho),
        profundidad: num(p.profundidad),
        peso: gramsToKg(p.peso),
        contenido: "Paquete",
        fragil: p.tipoPaquete === "fragil",
      })),
      costo_estimado: 0,
    };
  }

  // ─── Buscar comisionista ───
  async function goBuscar() {
    const msg = validateBeforeSubmit();
    if (msg) { setError(msg); return; }

    setLoading(true);
    setError("");

    try {
      const payloadBase = buildCrearEnvioPayloadBase();
      const bultos = form.paquetes.length;

      // ✅ La búsqueda usa fechaEntrega = día de viaje del comisionista
      const paramsBusqueda = {
        fechaEntrega: form.fechaEntrega,
        origenCiudad: payloadBase.origenCiudad,
        destinoCiudad: payloadBase.destinoCiudad,
        bultos,
      };

      localStorage.setItem("draftEnvio", JSON.stringify(form));
      localStorage.setItem("draftEnvioPayloadBase", JSON.stringify(payloadBase));
      localStorage.setItem("draftBusqueda", JSON.stringify(paramsBusqueda));

      navigate("/cliente/seleccionar-comisionista");
    } catch (e) {
      setError(getApiErrorMessage(e, "No se pudo preparar la búsqueda."));
    } finally {
      setLoading(false);
    }
  }

  // ─── Modal Origen ───
  function openModalGuardarOrigen() {
  if (!form.origenDireccion.trim()) return setError("Completá la dirección de retiro antes de guardar.");
  if (!form.origenProvincia) return setError("Seleccioná la provincia de retiro antes de guardar.");
  if (!form.origenLocalidad) return setError("Seleccioná la localidad de retiro antes de guardar.");
  if (!form.origenCP.trim()) return setError("Completá el código postal de retiro antes de guardar.");
  if (origenGeo.lat == null || origenGeo.lng == null) {
    return setError("Elegí una sugerencia de dirección (Google) para guardar las coordenadas.");
  }

  setError("");
  setOrigenModalError("");    // ← limpiar error del modal
  setOrigenModalStep("form");
  setLastSavedAlias("");

  setOrigenModalForm({
    alias:    "",
    direccion: form.origenDireccion,
    ciudad:   form.origenLocalidad,
    provincia: form.origenProvincia,
    cp:       form.origenCP,
  });

  // ✅ FIX B (origen): reusar localidades ya cargadas
  if (localidadesOrigen.length > 0) {
    setLocalidadesOrigenModal(localidadesOrigen);
  } else {
    loadLocalidades(setLocalidadesOrigenModal, form.origenProvincia);
  }

  setOpenOrigenModal(true);
}

  function onChangeOrigenModal(e) {
    const { name, value } = e.target;
    if (name === "provincia") {
      setOrigenModalForm((p) => ({ ...p, provincia: value, ciudad: "" }));
      loadLocalidades(setLocalidadesOrigenModal, value);
      return;
    }
    setOrigenModalForm((p) => ({ ...p, [name]: value }));
  }

  async function guardarNuevaDireccionOrigen() {
  const provName = provinciaNombreById(origenModalForm.provincia);
  const locName  = localidadNombreById(localidadesOrigenModal, origenModalForm.ciudad);

  const f = {
    alias:     origenModalForm.alias.trim(),
    direccion: origenModalForm.direccion.trim(),
    ciudad:    locName,
    provincia: provName,
    cp:        origenModalForm.cp.trim(),
    placeId:   origenGeo.placeId || "",
    lat:       origenGeo.lat ?? 0,
    lng:       origenGeo.lng ?? 0,
  };

  if (!f.alias || !f.direccion || !f.ciudad || !f.provincia || !f.cp) {
    setOrigenModalError("Completá alias, dirección, localidad, provincia y CP para guardar.");
    return;
  }
  if (!f.ciudad) {
    setOrigenModalError("La localidad no se pudo resolver. Cerrá el modal y volvé a abrirlo.");
    return;
  }

  setLoading(true);
  setOrigenModalError("");

  try {
    const created = await addDireccion(f);
    await refreshDirecciones();

    const newId = created?._id || created?.id;
    if (newId) {
      setForm((p) => ({
        ...p,
        origen: newId,
        origenDireccion: "", origenLocalidad: "", origenProvincia: "", origenCP: "",
      }));
      setLocalidadesOrigen([]);
      setOrigenGeo({ placeId: "", lat: null, lng: null, texto: "" });
    }

    setLastSavedAlias(f.alias);
    setOrigenModalStep("success");
  } catch (e) {
    setOrigenModalError(getApiErrorMessage(e, "No se pudo guardar la dirección."));
  } finally {
    setLoading(false);
  }
}

  // ─── Modal Destino ───
  function openModalGuardarDestino() {
  if (form.destinatarioId !== "nuevo") {
    setError("Elegí Nuevo destinatario… para poder guardarlo.");
    return;
  }
  if (destinoGeo.lat == null || destinoGeo.lng == null) {
    setError("Elegí una sugerencia de dirección (Google) para confirmar la ubicación del DESTINO.");
    return;
  }

  setError("");
  setDestinoModalError("");   // ← limpiar error del modal
  setDestinoModalStep("form");
  setLastSavedClienteNombre("");

  setDestinoModalForm({
    apellido:  form.apellido,
    nombre:    form.nombre,
    dni:       form.dni,
    telefono:  form.telefono,
    direccion: form.direccion,
    ciudad:    form.ciudad,
    provincia: form.provincia,
    cp:        form.cp,
  });

  // ✅ FIX B: si la provincia ya está cargada en el form principal,
  // reusar esas localidades directamente en vez de esperar la carga async.
  if (localidadesDestino.length > 0) {
    setLocalidadesDestinoModal(localidadesDestino);
  } else if (form.provincia) {
    loadLocalidades(setLocalidadesDestinoModal, form.provincia);
  }

  setOpenDestinoModal(true);
}

  function onChangeDestinoModal(e) {
    const { name, value } = e.target;
    if (name === "provincia") {
      setDestinoModalForm((p) => ({ ...p, provincia: value, ciudad: "" }));
      loadLocalidades(setLocalidadesDestinoModal, value);
      return;
    }
    setDestinoModalForm((p) => ({ ...p, [name]: value }));
  }

  async function guardarNuevoClienteDestino() {
  const provName = provinciaNombreById(destinoModalForm.provincia);
  const locName  = localidadNombreById(localidadesDestinoModal, destinoModalForm.ciudad);

  const f = {
    apellido:  destinoModalForm.apellido.trim(),
    nombre:    destinoModalForm.nombre.trim(),
    dni:       destinoModalForm.dni.trim(),
    telefono:  destinoModalForm.telefono.trim(),
    direccion: destinoModalForm.direccion.trim(),
    ciudad:    locName,
    provincia: provName,
    cp:        destinoModalForm.cp.trim(),
    placeId:   destinoGeo.placeId || "",
    lat:       destinoGeo.lat ?? 0,
    lng:       destinoGeo.lng ?? 0,
  };

  // ✅ FIX A: todas las validaciones usan setDestinoModalError, no setError
  if (!f.apellido || !f.nombre)  return setDestinoModalError("Completá apellido y nombre.");
  if (!f.dni || !/^\d{7,8}$/.test(f.dni)) return setDestinoModalError("DNI inválido (7 u 8 dígitos).");
  if (!f.telefono)               return setDestinoModalError("Completá el teléfono.");
  if (!f.direccion)              return setDestinoModalError("Completá la dirección.");
  if (!destinoModalForm.provincia) return setDestinoModalError("Seleccioná la provincia.");
  if (!destinoModalForm.ciudad)  return setDestinoModalError("Seleccioná la localidad.");
  if (!f.cp)                     return setDestinoModalError("Completá el código postal.");
  if (!f.ciudad)                 return setDestinoModalError("La localidad no se pudo resolver. Cerrá el modal, elegí la provincia y localidad de nuevo.");
  if (!f.placeId)                return setDestinoModalError("Elegí una dirección de la lista de sugerencias de Google antes de guardar.");

  setLoading(true);
  setDestinoModalError("");

  try {
    const created = await addDestinatario(f);
    await refreshDestinatarios();

    const newId = created?._id || created?.id;
    if (newId) {
      setForm((p) => ({
        ...p,
        destinatarioId: newId,
        apellido:  created.apellido  ?? f.apellido,
        nombre:    created.nombre    ?? f.nombre,
        dni:       created.dni       ?? f.dni,
        telefono:  created.telefono  ?? f.telefono,
        direccion: created.direccion ?? f.direccion,
        ciudad:    created.ciudad    ?? f.ciudad,
        provincia: created.provincia ?? f.provincia,
        cp:        created.cp        ?? f.cp,
      }));
    }

    setLastSavedClienteNombre(`${f.apellido} ${f.nombre}`.trim());
    setDestinoModalStep("success");   // ← cierra el form, muestra el éxito
  } catch (e) {
    // ✅ FIX A: error dentro del modal, visible para el usuario
    setDestinoModalError(getApiErrorMessage(e, "No se pudo guardar el destinatario."));
  } finally {
    setLoading(false);
  }
}

  // ─── Render ───
  return (
    <main className="bg-slate-100">
      <div className="overflow-x-hidden max-w-8xl px-4 lg:px-6 pt-4">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
          <div className="pt-30 col-span-4">
            <img src={heroImg} alt="Cajas apiladas" className="w-full object-fill" />
          </div>

          <div className="rounded-xl border bg-white p-6 col-span-8">
            <h1 className="text-3xl font-bold text-slate-700">Solicitar envío</h1>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 whitespace-pre-line">
                {error}
              </div>
            )}

            <div className="mt-2 space-y-2">

              {/* ───── ORIGEN ───── */}
              <Section title="Origen" icon={MapPin}>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Select
                    name="origen" value={form.origen} onChange={onChange}
                    options={direccionesRetiro} placeholder="Dirección de retiro"
                  />

                  {/* ✅ Franja horaria de disponibilidad para retiro */}
                  <Select
                    name="franjaHorariaRetiro" value={form.franjaHorariaRetiro} onChange={onChange}
                    options={FRANJAS_HORARIAS} placeholder="¿En qué horario estás disponible para el retiro?"
                  />

                  {form.origen === "otra" && (
                    <div className="md:col-span-2 grid grid-cols-12 gap-2">
                      <div className="col-span-12 relative">
                        <input
                          className="w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                          name="origenDireccion" value={form.origenDireccion}
                          onChange={(e) => {
                            onChange(e);
                            setOrigenQuery(e.target.value);
                            setOrigenGeo({ placeId: "", lat: null, lng: null, texto: "" });
                          }}
                          placeholder="Dirección (calle y número)"
                        />
                        {origenSug.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow max-h-64 overflow-auto">
                            {origenSug.map((s) => (
                              <button type="button" key={s.place_id}
                                onClick={() => pickOrigenSuggestion(s)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700">
                                {s.description}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Select className="col-span-6" name="origenProvincia" value={form.origenProvincia}
                        onChange={onChange} options={provincias.map((p) => ({ value: p.id, label: p.nombre }))}
                        placeholder="Provincia" />
                      <Select className="col-span-4" name="origenLocalidad" value={form.origenLocalidad}
                        onChange={onChange} options={localidadesOrigen.map((l) => ({ value: l.id, label: l.nombre }))}
                        placeholder={form.origenProvincia ? "Localidad" : "Elegí provincia primero"} />
                      <input className="col-span-2 w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                        name="origenCP" value={form.origenCP} onChange={onChange} placeholder="CP" />
                      <button className="mt-2 font-semibold text-blue-700 hover:underline col-span-3 text-left"
                        type="button" onClick={openModalGuardarOrigen}>
                        Guardar nueva dirección
                      </button>
                    </div>
                  )}
                </div>
              </Section>

              {/* ───── DESTINO ───── */}
              <Section title="Destino" icon={MapPin}>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                  <Select className="md:col-span-12" name="destinatarioId" value={form.destinatarioId}
                    onChange={onChange} options={clientesGuardados.map((c) => ({ value: c.id, label: c.label }))}
                    placeholder="Seleccionar destinatario" />

                  {form.destinatarioId === "nuevo" && (
                    <div className="md:col-span-12 grid grid-cols-12 gap-2">
                      <input className="col-span-6 w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                        name="apellido" value={form.apellido} onChange={onChange} placeholder="Apellido" />
                      <input className="col-span-6 w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                        name="nombre" value={form.nombre} onChange={onChange} placeholder="Nombre" />
                      <input className="col-span-3 w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                        name="dni" value={form.dni} onChange={onChange} placeholder="DNI" />
                      <input className="col-span-3 w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                        name="telefono" value={form.telefono} onChange={onChange} placeholder="Teléfono" />

                      <div className="col-span-6 relative">
                        <input className="w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                          name="direccion" value={form.direccion}
                          onChange={(e) => {
                            onChange(e);
                            setDestinoQuery(e.target.value);
                            setDestinoGeo({ placeId: "", lat: null, lng: null, texto: "" });
                          }}
                          placeholder="Dirección de envío" />
                        {destinoSug.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow max-h-64 overflow-auto">
                            {destinoSug.map((s) => (
                              <button type="button" key={s.place_id}
                                onClick={() => pickDestinoSuggestion(s)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700">
                                {s.description}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <Select className="col-span-4" name="provincia" value={form.provincia} onChange={onChange}
                        options={provincias.map((p) => ({ value: p.id, label: p.nombre }))} placeholder="Provincia" />
                      <Select className="col-span-6" name="ciudad" value={form.ciudad} onChange={onChange}
                        options={localidadesDestino.map((l) => ({ value: l.id, label: l.nombre }))}
                        placeholder={form.provincia ? "Localidad" : "Elegí provincia primero"} />
                      <input className="col-span-2 w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                        name="cp" value={form.cp} onChange={onChange} placeholder="CP" />

                      <button className="mt-2 font-semibold text-blue-700 hover:underline col-span-12 text-left"
                        type="button" onClick={openModalGuardarDestino}>
                        Guardar nuevo cliente
                      </button>
                    </div>
                  )}

                  {/* ✅ Fecha de entrega: la elige el cliente, sin hora */}
                  <div className="flex items-center gap-2 text-md font-bold text-slate-700 col-span-12 mt-2">
                    <Calendar1 className="w-4 h-4" />
                    <span>Fecha de entrega</span>
                    <DatePicker
                      selected={fromISODate(form.fechaEntrega)}
                      onChange={(date) => onChange({ target: { name: "fechaEntrega", value: toISODate(date) } })}
                      dateFormat="dd/MM/yyyy"
                      className="max-w-[140px] rounded-md border px-4 py-2 outline-none text-slate-700"
                      locale="es" calendarStartDay={1} minDate={new Date()}
                    />
                  </div>
                </div>
              </Section>

              {/* ───── PAQUETES ───── */}
              <Section title="Detalles de paquetes" icon={Package}>
                <div className="space-y-2">
                  {form.paquetes.map((paq, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <Select className="col-span-3" name="tipoPaquete" value={paq.tipoPaquete}
                        onChange={(e) => onChangePaquete(index, e)} options={tiposPaquete} placeholder="Tipo" />
                      <div className="col-span-9 grid grid-cols-12 gap-2 items-center">
                        {["alto", "ancho", "profundidad"].map((f) => (
                          <input key={f} className="col-span-3 w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                            name={f} value={paq[f]} onChange={(e) => onChangePaquete(index, e)}
                            placeholder={f.charAt(0).toUpperCase() + f.slice(1)} />
                        ))}
                        <input className="col-span-2 w-full rounded-md border px-4 py-2 outline-none text-slate-700"
                          name="peso" value={paq.peso} onChange={(e) => onChangePaquete(index, e)} placeholder="Peso (gr)" />
                        <button type="button" onClick={() => removePaquete(index)}
                          className="col-span-1 flex items-center justify-center rounded-md border px-2 py-2 hover:bg-slate-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-2 font-semibold text-blue-700 hover:underline" type="button" onClick={addPaquete}>
                  Nuevo paquete +
                </button>
              </Section>

              {/* ───── NOTAS ───── */}
              <Section title="Notas adicionales" icon={NotepadText}>
                <textarea name="notas" value={form.notas} onChange={onChange}
                  placeholder="Escribí acá cualquier indicación adicional..."
                  className="min-h-[60px] w-full rounded-xl border px-4 py-3 outline-none text-slate-700" />
              </Section>

              <div className="flex justify-end">
                <button type="button" onClick={goBuscar} disabled={loading}
                  className="rounded-full bg-blue-700 px-8 py-2 text-lg font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                  {loading ? "Buscando..." : "Buscar comisionista"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── MODAL ORIGEN ───── */}
      {openOrigenModal && (
  <div className="fixed inset-0 z-[999] flex items-center justify-center">
    <button type="button" onClick={() => setOpenOrigenModal(false)}
      className="absolute inset-0 bg-black/40" aria-label="Cerrar" />
    <div className="relative z-[1000] w-[92vw] max-w-2xl">
      <Card title={origenModalStep === "success" ? "Dirección guardada" : "Agregar nueva dirección"}>
        <button type="button" onClick={() => setOpenOrigenModal(false)}
          className="absolute right-4 top-4 rounded-md p-2 hover:bg-slate-100">
          <X className="w-5 h-5 text-slate-600" />
        </button>

        {origenModalStep === "form" ? (
          <>
            {/* ✅ FIX A: error visible DENTRO del modal */}
            {origenModalError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {origenModalError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input name="alias"    value={origenModalForm.alias}    onChange={onChangeOrigenModal} placeholder="Alias (Casa, Trabajo...)" />
              <Input name="direccion" value={origenModalForm.direccion} onChange={onChangeOrigenModal} placeholder="Dirección" />
              <Select name="provincia" value={origenModalForm.provincia} onChange={onChangeOrigenModal}
                options={provincias.map((p) => ({ value: p.id, label: p.nombre }))} placeholder="Provincia" />
              <Select name="ciudad" value={origenModalForm.ciudad} onChange={onChangeOrigenModal}
                options={localidadesOrigenModal.map((l) => ({ value: l.id, label: l.nombre }))}
                placeholder={origenModalForm.provincia ? "Localidad" : "Elegí provincia primero"} />
              <Input name="cp" value={origenModalForm.cp} onChange={onChangeOrigenModal} placeholder="Código postal" />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenOrigenModal(false)}>Cancelar</Button>
              <Button onClick={guardarNuevaDireccionOrigen} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-green-600 shrink-0" />
            <div>
              <div className="text-lg font-bold text-slate-800">Dirección guardada con éxito</div>
              <div className="text-slate-600">
                Se agregó <span className="font-semibold">{lastSavedAlias}</span> a tus direcciones.
              </div>
            </div>
            <div className="ml-auto">
              <Button onClick={() => setOpenOrigenModal(false)}>Listo</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  </div>
)}

      {/* ───── MODAL DESTINO ───── */}
      {openDestinoModal && (
  <div className="fixed inset-0 z-[999] flex items-center justify-center">
    <button type="button" onClick={() => setOpenDestinoModal(false)}
      className="absolute inset-0 bg-black/40" aria-label="Cerrar" />
    <div className="relative z-[1000] w-[92vw] max-w-2xl">
      <Card title={destinoModalStep === "success" ? "Cliente guardado" : "Guardar nuevo cliente"}>
        <button type="button" onClick={() => setOpenDestinoModal(false)}
          className="absolute right-4 top-4 rounded-md p-2 hover:bg-slate-100">
          <X className="w-5 h-5 text-slate-600" />
        </button>

        {destinoModalStep === "form" ? (
          <>
            {/* ✅ FIX A: error visible DENTRO del modal */}
            {destinoModalError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {destinoModalError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input name="apellido" value={destinoModalForm.apellido} onChange={onChangeDestinoModal} placeholder="Apellido" />
              <Input name="nombre"   value={destinoModalForm.nombre}   onChange={onChangeDestinoModal} placeholder="Nombre" />
              <Input name="dni"      value={destinoModalForm.dni}      onChange={onChangeDestinoModal} placeholder="DNI" />
              <Input name="telefono" value={destinoModalForm.telefono} onChange={onChangeDestinoModal} placeholder="Teléfono" />
              <Input name="direccion" value={destinoModalForm.direccion} onChange={onChangeDestinoModal} placeholder="Dirección" />
              <Select name="provincia" value={destinoModalForm.provincia} onChange={onChangeDestinoModal}
                options={provincias.map((p) => ({ value: p.id, label: p.nombre }))} placeholder="Provincia" />
              <Select name="ciudad" value={destinoModalForm.ciudad} onChange={onChangeDestinoModal}
                options={localidadesDestinoModal.map((l) => ({ value: l.id, label: l.nombre }))}
                placeholder={destinoModalForm.provincia ? "Localidad" : "Elegí provincia primero"} />
              <Input name="cp" value={destinoModalForm.cp} onChange={onChangeDestinoModal} placeholder="Código postal" />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDestinoModal(false)}>Cancelar</Button>
              <Button onClick={guardarNuevoClienteDestino} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-green-600 shrink-0" />
            <div>
              <div className="text-lg font-bold text-slate-800">Cliente guardado con éxito</div>
              <div className="text-slate-600">
                Se agregó <span className="font-semibold">{lastSavedClienteNombre}</span> a tus destinatarios.
              </div>
            </div>
            <div className="ml-auto">
              <Button onClick={() => setOpenDestinoModal(false)}>Listo</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  </div>
)}
    </main>
  );
}

/* ─── UI helpers ─── */
function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-md font-bold text-slate-700">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Select({ className = "", options = [], placeholder = "Seleccionar...", ...props }) {
  return (
    <select {...props} className={`w-full rounded-lg border px-4 py-2 outline-none text-slate-700 bg-white ${className}`}>
      <option value="">{placeholder}</option>
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const l = typeof opt === "string" ? opt : opt.label;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

/* ─── Helpers fechas ─── */
function toISODate(d) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function getTodayISO() {
  return toISODate(new Date());
}

/* ─── Helpers numéricos/errores ─── */
function num(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function gramsToKg(g) {
  const n = num(g);
  return n > 0 ? n / 1000 : 0;
}
function getApiErrorMessage(err, fallback = "Ocurrió un error.") {
  const data = err?.response?.data;
  if (Array.isArray(data?.detalles) && data.detalles.length > 0) {
    return data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join("\n");
  }
  return data?.error || data?.message || err?.message || fallback;
}