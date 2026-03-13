//flexidrive-front\src\pages\comisionista\MediosPagoComisionista.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Landmark,
  Wallet,
  Save,
  Pencil,
  Trash2,
  CheckCircle2,
  Banknote,
  CreditCard,
} from "lucide-react";
import { getMyProfile } from "../../services/profileService/profileService";
import { updateDatosBancarios, clearDatosBancarios } from "../../services/profileService/profileService";

const LS_BANK_KEY = "flexidrive_datos_bancarios_comisionista";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

const emptyForm = {
  aceptaEfectivo: false,
  aceptaTransferencia: false,
  titular: "",
  alias: "",
  cbu: "",
  banco: "",
};

export default function MediosPagoComisionista() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [guardado, setGuardado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      // 1. Cargar preferencias de cobro desde localStorage (caché local)
      const saved = safeJsonParse(localStorage.getItem(LS_BANK_KEY), null);

      // 2. Cargar datos bancarios reales desde el perfil (fuente de verdad = DB)
      try {
        const perfil = await getMyProfile();
        const com = perfil?.comisionista || {};

        const datosDB = {
          titular: com.alias || "",
          alias: com.alias || "",
          cbu: com.cbu || "",
          banco: com.entidadBancaria || "",
          // Leer los booleans directamente desde la DB
          aceptaEfectivo: Boolean(com.aceptaEfectivo),
          aceptaTransferencia: Boolean(com.aceptaTransferencia),
        };

        // La DB es la fuente de verdad para los booleans.
        // localStorage solo se usa como caché para los campos de texto si la DB aún no los tiene.
        const formFinal = {
          aceptaEfectivo: datosDB.aceptaEfectivo,
          aceptaTransferencia: datosDB.aceptaTransferencia,
          titular: saved?.titular || datosDB.titular,
          alias: saved?.alias || datosDB.alias,
          cbu: saved?.cbu || datosDB.cbu,
          banco: saved?.banco || datosDB.banco,
        };

        setForm(formFinal);

        // Si hay datos guardados en DB (tiene CBU o algún booleano activo), mostrar como guardado
        const tieneConfigDB = com.cbu || com.aceptaEfectivo || com.aceptaTransferencia;
        if (tieneConfigDB) {
          setGuardado(formFinal);
          setModoEdicion(false);
          // Sincronizar localStorage con la DB
          localStorage.setItem(LS_BANK_KEY, JSON.stringify(formFinal));
        } else if (saved) {
          // Sin datos en DB pero hay caché local (estado inconsistente, raro)
          setGuardado(saved);
          setForm(saved);
          setModoEdicion(false);
        }
      } catch {
        // Si falla el fetch, usar solo localStorage
        if (saved) {
          setGuardado(saved);
          setForm(saved);
          setModoEdicion(false);
        }
      }
    }

    cargarDatos();
  }, []);

  const tieneAlgunaOpcion = useMemo(() => {
    return form.aceptaEfectivo || form.aceptaTransferencia;
  }, [form]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function validar() {
    if (!form.aceptaEfectivo && !form.aceptaTransferencia) {
      return "Seleccioná al menos una opción de cobro.";
    }
    if (form.aceptaTransferencia) {
      if (!form.titular.trim()) return "Completá el titular de la cuenta.";
      if (!form.alias.trim()) return "Completá el alias.";
      if (!form.cbu.trim()) return "Completá el CBU o CVU.";
      if (!form.banco.trim()) return "Completá el banco o billetera.";
    }
    return "";
  }

  async function handleGuardar(e) {
    e.preventDefault();
    const error = validar();
    if (error) { setMensaje(error); return; }

    const payload = {
      aceptaEfectivo: Boolean(form.aceptaEfectivo),
      aceptaTransferencia: Boolean(form.aceptaTransferencia),
      titular: form.aceptaTransferencia ? form.titular.trim() : "",
      alias: form.aceptaTransferencia ? form.alias.trim() : "",
      cbu: form.aceptaTransferencia ? form.cbu.trim() : "",
      banco: form.aceptaTransferencia ? form.banco.trim() : "",
    };

    try {
      // Guardar en DB — incluye los booleans
      await updateDatosBancarios({
        alias: payload.alias,
        cbu: payload.cbu,
        entidadBancaria: payload.banco,
        aceptaEfectivo: payload.aceptaEfectivo,
        aceptaTransferencia: payload.aceptaTransferencia,
      });

      // Caché local
      localStorage.setItem(LS_BANK_KEY, JSON.stringify(payload));
      setGuardado(payload);
      setForm(payload);
      setModoEdicion(false);
      setMensaje("Medios de pago guardados correctamente.");
    } catch (err) {
      setMensaje(err?.message || "No se pudieron guardar los datos.");
    }
  }

  function handleEditar() {
    setModoEdicion(true);
    setMensaje("");
  }

  async function handleEliminar() {
    try {
      // clearDatosBancarios también resetea los booleans en DB
      await clearDatosBancarios();
      localStorage.removeItem(LS_BANK_KEY);
      setGuardado(null);
      setForm(emptyForm);
      setModoEdicion(true);
      setMensaje("Medios de pago eliminados.");
    } catch (err) {
      setMensaje(err?.message || "No se pudieron eliminar los datos.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <section>
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
          Medios de pago
        </h1>
        <p className="mt-2 text-slate-600">
          Configurá cómo querés cobrar tus envíos.
        </p>
        <div className="mt-4 h-px w-full bg-slate-200" />
      </section>

      {mensaje && (
        <div
          className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
            mensaje.toLowerCase().includes("correctamente")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : mensaje.toLowerCase().includes("eliminados")
              ? "border border-amber-200 bg-amber-50 text-amber-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-700">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Configuración de cobro
              </h2>
              <p className="text-sm text-slate-500">
                Elegí los medios de pago que querés aceptar.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleGuardar}>
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  name="aceptaEfectivo"
                  checked={form.aceptaEfectivo}
                  onChange={handleChange}
                  disabled={!modoEdicion}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    <span className="font-semibold">Aceptar pagos en efectivo</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    El cliente puede abonarte directamente en efectivo.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  name="aceptaTransferencia"
                  checked={form.aceptaTransferencia}
                  onChange={handleChange}
                  disabled={!modoEdicion}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-slate-800">
                    <CreditCard className="h-5 w-5 text-blue-700" />
                    <span className="font-semibold">
                      Aceptar transferencia bancaria / billetera
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Si activás esta opción, completá los datos bancarios.
                  </p>
                </div>
              </label>
            </div>

            {form.aceptaTransferencia && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-blue-700" />
                  <h3 className="text-base font-bold text-slate-800">Datos bancarios</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Titular</label>
                    <input
                      type="text"
                      name="titular"
                      value={form.titular}
                      onChange={handleChange}
                      disabled={!modoEdicion}
                      placeholder="Nombre del titular"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Alias</label>
                    <input
                      type="text"
                      name="alias"
                      value={form.alias}
                      onChange={handleChange}
                      disabled={!modoEdicion}
                      placeholder="Ej: lucia.envios.mp"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">CBU / CVU</label>
                    <input
                      type="text"
                      name="cbu"
                      value={form.cbu}
                      onChange={handleChange}
                      disabled={!modoEdicion}
                      placeholder="Ingresá tu CBU o CVU"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Banco / billetera</label>
                    <input
                      type="text"
                      name="banco"
                      value={form.banco}
                      onChange={handleChange}
                      disabled={!modoEdicion}
                      placeholder="Ej: Banco Nación / Mercado Pago"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {modoEdicion ? (
              <button
                type="submit"
                disabled={!tieneAlgunaOpcion}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Guardar medios de pago
              </button>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleEditar}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleEliminar}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Opciones habilitadas</h2>
              <p className="text-sm text-slate-500">
                Resumen de los medios de pago que tenés activos.
              </p>
            </div>
          </div>

          {guardado ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Tus medios de pago están guardados.
              </div>
              <div className="space-y-3">
                {guardado.aceptaEfectivo && (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Efectivo</div>
                      <div className="text-sm text-slate-500">
                        Cobro presencial en efectivo.
                      </div>
                    </div>
                  </div>
                )}
                {guardado.aceptaTransferencia && (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <CreditCard className="h-5 w-5 text-blue-700" />
                    <div>
                      <div className="font-semibold text-slate-800">Transferencia bancaria / billetera</div>
                      <div className="text-sm text-slate-500">Medio habilitado para cobro digital.</div>
                    </div>
                  </div>
                )}
                {!guardado.aceptaEfectivo && !guardado.aceptaTransferencia && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No hay medios de pago habilitados.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Todavía no configuraste medios de pago.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
