// flexidrive-front/src/pages/comisionista/RutaModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { getProvinciasAR, getLocalidadesByProvincia } from "../../services/geoService";
import { getMyVehicles, registerVehiculo } from "../../services/authService";
import { useToast } from "../../components/toast/useToast";
import VehiculoModal from "./VehiculoModal";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const emptyPlace = () => ({
  provinciaId: "",
  provinciaNombre: "",
  localidadId: "",
  localidadNombre: "",
});

export default function RutaModal({ open, onClose, onSave, initial }) {
  const { toast } = useToast();

  const [openVehiculoModal, setOpenVehiculoModal] = useState(false);
  const [descuento, setDescuento] = useState({
    minBultos: "",
    tipo: "porcentaje",
    valor: "",
  });

  const isEdit = !!(initial?._id || initial?.id);

  const [form, setForm] = useState({
    vehiculoId: "",
    origen: emptyPlace(),
    destino: emptyPlace(),
    intermedias: [],
    dias: [],
    activa: true,
    preciosPorLocalidad: [],
  });

  const [provincias, setProvincias] = useState([]);
  const [locOrigen, setLocOrigen] = useState([]);
  const [locDestino, setLocDestino] = useState([]);
  const [locInter, setLocInter] = useState({});
  const [vehiculos, setVehiculos] = useState([]);
  const [precioBase, setPrecioBase] = useState("");

  const prevOrigenProvRef = useRef(null);
  const prevDestinoProvRef = useRef(null);
  const isHydratingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const provs = await getProvinciasAR();
        setProvincias(Array.isArray(provs) ? provs : []);
      } catch {
        setProvincias([]);
      }
    })();
    reloadVehiculos();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (!initial) {
      prevOrigenProvRef.current = "";
      prevDestinoProvRef.current = "";
      isHydratingRef.current = false;
      setForm({
        vehiculoId: "",
        origen: emptyPlace(),
        destino: emptyPlace(),
        intermedias: [],
        dias: [],
        activa: true,
        preciosPorLocalidad: [],
      });
      setLocOrigen([]);
      setLocDestino([]);
      setLocInter({});
      setPrecioBase("");
      setDescuento({ minBultos: "", tipo: "porcentaje", valor: "" });
      return;
    }

    if (provincias.length === 0) return;

    const inter = Array.isArray(initial.intermedias) ? initial.intermedias : [];

    const origenPlace = {
      provinciaId: String(initial?.origen?.provinciaId || ""),
      provinciaNombre: initial?.origen?.provinciaNombre || "",
      localidadId: String(initial?.origen?.localidadId || ""),
      localidadNombre: initial?.origen?.localidadNombre || "",
    };
    const destinoPlace = {
      provinciaId: String(initial?.destino?.provinciaId || ""),
      provinciaNombre: initial?.destino?.provinciaNombre || "",
      localidadId: String(initial?.destino?.localidadId || ""),
      localidadNombre: initial?.destino?.localidadNombre || "",
    };
    const interResolved = inter.map((it) => ({
      provinciaId: String(it?.provinciaId || ""),
      provinciaNombre: it?.provinciaNombre || "",
      localidadId: String(it?.localidadId || ""),
      localidadNombre: it?.localidadNombre || "",
    }));

    prevOrigenProvRef.current = String(origenPlace.provinciaId || "");
    prevDestinoProvRef.current = String(destinoPlace.provinciaId || "");

    const vehiculoIdNormalizado = String(
      initial.vehiculoId || initial.vehiculo?._id || initial.vehiculo?.id || ""
    );

    const preciosNormalizados = Array.isArray(initial.preciosPorLocalidad)
      ? initial.preciosPorLocalidad.map((x) => ({
          localidadId: String(x.localidadId || ""),
          localidadNombre: x.localidadNombre || "",
          precioPorBulto: String(x.precioPorBulto ?? x.precio ?? ""),
        }))
      : [];

    isHydratingRef.current = true;

    setForm({
      vehiculoId: vehiculoIdNormalizado,
      origen: origenPlace,
      destino: destinoPlace,
      intermedias: interResolved,
      dias: Array.isArray(initial.dias) ? initial.dias : [],
      activa: initial.activa ?? true,
      preciosPorLocalidad: preciosNormalizados,
    });

    setPrecioBase("");
    setDescuento({
      minBultos: String(initial?.descuentoPorBultos?.minBultos ?? ""),
      tipo: initial?.descuentoPorBultos?.tipo || "porcentaje",
      valor: String(initial?.descuentoPorBultos?.valor ?? ""),
    });

    (async () => {
      try {
        const [locsOrigen, locsDestino] = await Promise.all([
          origenPlace.provinciaId
            ? getLocalidadesByProvincia(origenPlace.provinciaId).catch(() => [])
            : Promise.resolve([]),
          destinoPlace.provinciaId
            ? getLocalidadesByProvincia(destinoPlace.provinciaId).catch(() => [])
            : Promise.resolve([]),
        ]);
        setLocOrigen(Array.isArray(locsOrigen) ? locsOrigen : []);
        setLocDestino(Array.isArray(locsDestino) ? locsDestino : []);

        const map = {};
        for (let idx = 0; idx < interResolved.length; idx++) {
          const it = interResolved[idx];
          if (!it?.provinciaId) continue;
          try {
            const locs = await getLocalidadesByProvincia(it.provinciaId);
            map[idx] = Array.isArray(locs) ? locs : [];
          } catch {
            map[idx] = [];
          }
        }
        setLocInter(map);
      } catch {
        setLocOrigen([]);
        setLocDestino([]);
        setLocInter({});
      } finally {
        isHydratingRef.current = false;
      }
    })();
  }, [open, initial, provincias.length]);

  useEffect(() => {
    if (!open) return;
    const pid = String(form.origen.provinciaId || "");
    if (!pid) {
      setLocOrigen([]);
      return;
    }
    if (pid === String(prevOrigenProvRef.current || "")) return;
    prevOrigenProvRef.current = pid;
    setForm((p) => ({ ...p, origen: { ...p.origen, localidadId: "", localidadNombre: "" } }));
    getLocalidadesByProvincia(pid)
      .then((locs) => setLocOrigen(Array.isArray(locs) ? locs : []))
      .catch(() => setLocOrigen([]));
  }, [form.origen.provinciaId, open]);

  useEffect(() => {
    if (!open) return;
    const pid = String(form.destino.provinciaId || "");
    if (!pid) {
      setLocDestino([]);
      return;
    }
    if (pid === String(prevDestinoProvRef.current || "")) return;
    prevDestinoProvRef.current = pid;
    setForm((p) => ({ ...p, destino: { ...p.destino, localidadId: "", localidadNombre: "" } }));
    getLocalidadesByProvincia(pid)
      .then((locs) => setLocDestino(Array.isArray(locs) ? locs : []))
      .catch(() => setLocDestino([]));
  }, [form.destino.provinciaId, open]);

  function toggleDia(d) {
    setForm((p) => ({
      ...p,
      dias: p.dias.includes(d) ? p.dias.filter((x) => x !== d) : [...p.dias, d],
    }));
  }

  function setOrigenProvincia(provinciaId) {
    const prov = provincias.find((p) => p.id === provinciaId);
    setForm((p) => ({ ...p, origen: { ...p.origen, provinciaId, provinciaNombre: prov?.nombre || "" } }));
  }

  function setDestinoProvincia(provinciaId) {
    const prov = provincias.find((p) => p.id === provinciaId);
    setForm((p) => ({ ...p, destino: { ...p.destino, provinciaId, provinciaNombre: prov?.nombre || "" } }));
  }

  function setOrigenLocalidad(localidadId) {
    const loc = locOrigen.find((l) => l.id === localidadId);
    setForm((p) => ({ ...p, origen: { ...p.origen, localidadId, localidadNombre: loc?.nombre || "" } }));
  }

  function setDestinoLocalidad(localidadId) {
    const loc = locDestino.find((l) => l.id === localidadId);
    setForm((p) => ({ ...p, destino: { ...p.destino, localidadId, localidadNombre: loc?.nombre || "" } }));
  }

  async function setIntermediaProvincia(index, provinciaId) {
    const prov = provincias.find((p) => p.id === provinciaId);
    try {
      const locs = await getLocalidadesByProvincia(provinciaId);
      setLocInter((m) => ({ ...m, [index]: Array.isArray(locs) ? locs : [] }));
    } catch {
      setLocInter((m) => ({ ...m, [index]: [] }));
    }
    setForm((p) => {
      const next = [...p.intermedias];
      next[index] = {
        ...next[index],
        provinciaId,
        provinciaNombre: prov?.nombre || "",
        localidadId: "",
        localidadNombre: "",
      };
      return { ...p, intermedias: next };
    });
  }

  function setIntermediaLocalidad(index, localidadId) {
    const locs = locInter[index] || [];
    const loc = locs.find((l) => l.id === localidadId);
    setForm((p) => {
      const next = [...p.intermedias];
      next[index] = { ...next[index], localidadId, localidadNombre: loc?.nombre || "" };
      return { ...p, intermedias: next };
    });
  }

  function addIntermedia() {
    setForm((p) => ({ ...p, intermedias: [...p.intermedias, emptyPlace()] }));
  }

  function removeIntermedia(index) {
    setForm((p) => ({ ...p, intermedias: p.intermedias.filter((_, i) => i !== index) }));
    setLocInter((m) => {
      const next = {};
      Object.entries(m).forEach(([key, val]) => {
        const k = Number(key);
        if (k < index) next[k] = val;
        else if (k > index) next[k - 1] = val;
      });
      return next;
    });
  }

  const allRouteLocalities = useMemo(() => {
    const list = [];
    if (form.destino.localidadId) {
      list.push({ localidadId: form.destino.localidadId, localidadNombre: form.destino.localidadNombre });
    }
    for (const it of form.intermedias) {
      if (it.localidadId) list.push({ localidadId: it.localidadId, localidadNombre: it.localidadNombre });
    }
    const map = new Map();
    for (const x of list) map.set(x.localidadId, x);
    return Array.from(map.values());
  }, [form.destino, form.intermedias]);

  useEffect(() => {
    if (!open || isHydratingRef.current) return;

    setForm((p) => {
      const existing = Array.isArray(p.preciosPorLocalidad) ? p.preciosPorLocalidad : [];
      const byId = new Map(existing.map((x) => [x.localidadId, x.precioPorBulto]));
      const byNombre = new Map(existing.map((x) => [x.localidadNombre, x.precioPorBulto]));

      const rebuilt = allRouteLocalities.map((loc) => ({
        localidadId: loc.localidadId,
        localidadNombre: loc.localidadNombre,
        precioPorBulto:
          byId.get(loc.localidadId) ??
          byNombre.get(loc.localidadNombre) ??
          "",
      }));

      return { ...p, preciosPorLocalidad: rebuilt };
    });
  }, [allRouteLocalities, open]);

  useEffect(() => {
    if (!open || isHydratingRef.current) return;
    setPrecioBase("");
  }, [allRouteLocalities, open]);

  function setPrecio(localidadId, value) {
    setForm((p) => ({
      ...p,
      preciosPorLocalidad: (p.preciosPorLocalidad || []).map((x) =>
        x.localidadId === localidadId ? { ...x, precioPorBulto: value } : x
      ),
    }));
  }

  function autocompletarPrecios() {
    const n = Number(precioBase);
    if (!n || n <= 0) {
      toast.warning("Ingresá un precio base válido (mayor a 0).");
      return;
    }

    setForm((p) => ({
      ...p,
      preciosPorLocalidad: (p.preciosPorLocalidad || []).map((row) => ({
        ...row,
        precioPorBulto: String(n),
      })),
    }));
  }

  async function reloadVehiculos(selectId = "") {
    try {
      const data = await getMyVehicles();
      const arr = Array.isArray(data) ? data : [];
      setVehiculos(arr);
      if (selectId) setForm((p) => ({ ...p, vehiculoId: String(selectId) }));
    } catch {
      setVehiculos([]);
    }
  }

  function validate() {
    if (!form.vehiculoId) return "Elegí un vehículo para esta ruta.";
    if (!form.origen.provinciaId || !form.origen.localidadId) return "Elegí provincia y localidad de ORIGEN.";
    if (!form.destino.provinciaId || !form.destino.localidadId) return "Elegí provincia y localidad de DESTINO.";
    for (const [i, it] of form.intermedias.entries()) {
      const any = it.provinciaId || it.localidadId || it.provinciaNombre || it.localidadNombre;
      if (any && (!it.provinciaId || !it.localidadId)) {
        return `Completá provincia y localidad en la intermedia #${i + 1} o eliminála.`;
      }
    }
    if (form.dias.length === 0) return "Elegí al menos un día.";
    for (const row of form.preciosPorLocalidad) {
      if (!row.localidadId) continue;
      const n = Number(row.precioPorBulto);
      if (!n || n <= 0) return `Indicá un precio por bulto válido para ${row.localidadNombre}.`;
    }
    return "";
  }

  async function submit(e) {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      toast.warning(msg);
      return;
    }

    const intermediasOk = form.intermedias.filter((it) => it.provinciaId && it.localidadId);

    const payload = {
      vehiculoId: form.vehiculoId,
      origen: form.origen,
      destino: form.destino,
      intermedias: intermediasOk,
      dias: form.dias,
      activa: !!form.activa,
      preciosPorLocalidad: (form.preciosPorLocalidad || []).map((x) => ({
        localidadId: String(x.localidadId || ""),
        localidadNombre: x.localidadNombre || "",
        precioPorBulto: x.precioPorBulto,
      })),
      descuentoPorBultos: {
        minBultos: Number(descuento.minBultos) || 0,
        tipo: descuento.tipo,
        valor: Number(descuento.valor) || 0,
      },
    };

    await onSave(payload);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 w-[95%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="text-lg font-extrabold text-slate-800">
            {isEdit ? "Editar ruta" : "Nueva ruta"}
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-md hover:bg-slate-100 grid place-items-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5 overflow-y-auto flex-1">
          <div className="rounded-xl border p-4 space-y-2">
            <div className="text-sm font-bold text-slate-700">Vehículo</div>
            <select
              value={form.vehiculoId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new__") {
                  setForm((p) => ({ ...p, vehiculoId: "" }));
                  setOpenVehiculoModal(true);
                  return;
                }
                setForm((p) => ({ ...p, vehiculoId: v }));
              }}
              className="w-full rounded-md border px-3 py-2 outline-none"
            >
              <option value="">Seleccionar…</option>
              <option value="__new__">➕ Cargar nuevo vehículo…</option>
              {vehiculos.map((v) => {
                const vid = String(v._id ?? v.id ?? "");
                const parts = [
                  (v.nombre || "").trim(),
                  `${v.marca || ""} ${v.modelo || ""}`.trim(),
                  v.patente || "",
                ].filter(Boolean);
                return (
                  <option key={vid} value={vid}>
                    {parts.join(" · ") || vid}
                  </option>
                );
              })}
            </select>
            {vehiculos.length === 0 && (
              <div className="text-xs text-slate-500">
                No tenés vehículos cargados. Podés cargar uno desde acá con "Cargar nuevo vehículo…".
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlacePicker
              title="Origen"
              provincias={provincias}
              localidades={locOrigen}
              value={form.origen}
              onProvinciaChange={setOrigenProvincia}
              onLocalidadChange={setOrigenLocalidad}
            />
            <PlacePicker
              title="Destino"
              provincias={provincias}
              localidades={locDestino}
              value={form.destino}
              onProvinciaChange={setDestinoProvincia}
              onLocalidadChange={setDestinoLocalidad}
            />
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-slate-800">Localidades intermedias</div>
              <button
                type="button"
                onClick={addIntermedia}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-slate-50 font-bold"
              >
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
            {form.intermedias.length === 0 ? (
              <div className="text-sm text-slate-500">No agregaste localidades intermedias.</div>
            ) : (
              <div className="space-y-3">
                {form.intermedias.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-700">Provincia</div>
                      <select
                        value={it.provinciaId}
                        onChange={(e) => setIntermediaProvincia(idx, e.target.value)}
                        className="w-full rounded-md border px-3 py-2 outline-none"
                      >
                        <option value="">Seleccionar…</option>
                        {provincias.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-700">Localidad</div>
                      <select
                        value={it.localidadId}
                        onChange={(e) => setIntermediaLocalidad(idx, e.target.value)}
                        className="w-full rounded-md border px-3 py-2 outline-none"
                        disabled={!it.provinciaId}
                      >
                        <option value="">Seleccionar…</option>
                        {(locInter[idx] || []).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIntermedia(idx)}
                      className="h-10 w-10 rounded-md border hover:bg-red-50 grid place-items-center"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-700">Días de la semana</div>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => {
                const active = form.dias.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDia(d)}
                    className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${
                      active
                        ? "bg-blue-700 text-white border-blue-700"
                        : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="font-extrabold text-slate-800">Precio por bulto por localidad</div>
                <div className="text-sm text-slate-500">
                  Cargá el precio por bulto para destino e intermedias.
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={precioBase}
                  onChange={(e) => setPrecioBase(e.target.value)}
                  className="w-40 rounded-md border px-3 py-2 outline-none"
                  placeholder="Precio base"
                />
                <button
                  type="button"
                  onClick={autocompletarPrecios}
                  className="px-4 py-2 rounded-md bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-60"
                  disabled={form.preciosPorLocalidad.length === 0}
                >
                  Autocompletar
                </button>
              </div>
            </div>
            {form.preciosPorLocalidad.length === 0 ? (
              <div className="text-sm text-slate-500">
                Elegí destino/intermedias para poder cargar precios.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {form.preciosPorLocalidad.map((row) => (
                  <div key={row.localidadId || row.localidadNombre} className="rounded-xl border bg-white p-3">
                    <div className="text-sm font-bold text-slate-700">{row.localidadNombre}</div>
                    <div className="mt-2">
                      <input
                        type="number"
                        min="1"
                        value={row.precioPorBulto}
                        onChange={(e) => setPrecio(row.localidadId, e.target.value)}
                        className="w-full rounded-md border px-3 py-2 outline-none"
                        placeholder="Ej: 1200"
                      />
                      <div className="text-xs text-slate-500 font-semibold mt-1">
                        total = precioPorBulto × bultos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div>
              <div className="font-extrabold text-slate-800">Descuento por cantidad de bultos</div>
              <div className="text-sm text-slate-500">
                Opcional. Se aplica cuando el envío supera el mínimo de bultos.
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-700">Mínimo de bultos</div>
                <input
                  type="number"
                  min="1"
                  value={descuento.minBultos}
                  onChange={(e) => setDescuento((d) => ({ ...d, minBultos: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  placeholder="Ej: 5"
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-700">Tipo de descuento</div>
                <select
                  value={descuento.tipo}
                  onChange={(e) => setDescuento((d) => ({ ...d, tipo: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                >
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto">Monto fijo ($)</option>
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-700">
                  {descuento.tipo === "porcentaje" ? "Porcentaje" : "Monto ($)"}
                </div>
                <input
                  type="number"
                  min="0"
                  max={descuento.tipo === "porcentaje" ? 100 : undefined}
                  value={descuento.valor}
                  onChange={(e) => setDescuento((d) => ({ ...d, valor: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 outline-none"
                  placeholder={descuento.tipo === "porcentaje" ? "Ej: 10" : "Ej: 500"}
                />
              </div>
            </div>
            {descuento.minBultos && descuento.valor ? (
              <div className="text-xs text-purple-700 font-semibold bg-purple-50 rounded-lg px-3 py-2">
                Vista previa: desde {descuento.minBultos} bultos →{" "}
                {descuento.tipo === "porcentaje"
                  ? `${descuento.valor}% de descuento`
                  : `$${descuento.valor} de descuento por bulto`}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <div className="font-extrabold text-slate-800">Estado</div>
              <div className="text-sm text-slate-500">Podés pausar la ruta sin eliminarla.</div>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) => setForm((p) => ({ ...p, activa: e.target.checked }))}
              />
              Ruta activa
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-md bg-blue-700 text-white font-bold hover:bg-blue-800">
              {isEdit ? "Guardar cambios" : "Crear ruta"}
            </button>
          </div>
        </form>
      </div>

      <VehiculoModal
        open={openVehiculoModal}
        onClose={() => setOpenVehiculoModal(false)}
        onSave={async (vehiculoData) => {
          const nuevo = await registerVehiculo(vehiculoData);
          setOpenVehiculoModal(false);
          await reloadVehiculos(nuevo?._id ?? nuevo?.id);
          toast.success("Vehículo cargado correctamente.");
        }}
      />
    </div>
  );
}

function PlacePicker({ title, provincias, localidades, value, onProvinciaChange, onLocalidadChange }) {
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="font-extrabold text-slate-800">{title}</div>
      <div className="space-y-1">
        <div className="text-sm font-bold text-slate-700">Provincia</div>
        <select
          value={value.provinciaId}
          onChange={(e) => onProvinciaChange(e.target.value)}
          className="w-full rounded-md border px-3 py-2 outline-none"
        >
          <option value="">Seleccionar…</option>
          {provincias.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-bold text-slate-700">Localidad</div>
        <select
          value={value.localidadId}
          onChange={(e) => onLocalidadChange(e.target.value)}
          className="w-full rounded-md border px-3 py-2 outline-none"
          disabled={!value.provinciaId}
        >
          <option value="">Seleccionar…</option>
          {localidades.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}