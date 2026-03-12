// flexidrive-front/src/pages/comisionista/VehiculoModal.jsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const TIPOS_VEHICULO = [
    { value: "auto", label: "Auto" },
    { value: "camioneta", label: "Camioneta" },
    { value: "utilitario", label: "Utilitario" },
    { value: "furgon", label: "Furgón" },
];

const empty = () => ({
    nombre: "",
    tipo: "",
    marca: "",
    modelo: "",
    patente: "",
    adicionales: "",
});

export default function VehiculoModal({ open, onClose, onSave, initial }) {
    const isEdit = !!initial?._id;

    const [form, setForm] = useState(empty());

    useEffect(() => {
        if (!open) return;

        if (!initial) {
            setForm(empty());
        } else {
            setForm({
                nombre: initial.nombre || "",
                tipo: initial.tipo || "",
                marca: initial.marca || "",
                modelo: initial.modelo || "",
                patente: initial.patente || "",
                adicionales: initial.adicionales || "",
            });
        }
    }, [open, initial]);

    function onChange(e) {
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    }

    function validate() {
        if (!form.tipo) return "Seleccioná el tipo de vehículo.";
        if (!form.patente.trim()) return "Ingresá la patente.";
        if (!form.marca.trim()) return "Ingresá la marca.";
        if (!form.modelo.trim()) return "Ingresá el modelo.";
        return "";
    }

    async function submit(e) {
        e.preventDefault();
        const msg = validate();
        if (msg) return alert(msg);

        await onSave({
            nombre: form.nombre.trim(),
            tipo: form.tipo,
            marca: form.marca.trim(),
            modelo: form.modelo.trim(),
            patente: form.patente.trim().toUpperCase(),
            adicionales: form.adicionales.trim(),
        });
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="absolute left-1/2 top-1/2 w-[95%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="text-lg font-extrabold text-slate-800">
                        {isEdit ? "Editar vehículo" : "Nuevo vehículo"}
                    </div>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-md hover:bg-slate-100 grid place-items-center"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-4">

                    {/* Tipo de vehículo (NUEVO) */}
                    <Field label="Tipo de vehículo *">
                        <select
                            name="tipo"
                            value={form.tipo}
                            onChange={onChange}
                            className="w-full rounded-md border px-3 py-2 outline-none"
                        >
                            <option value="">Seleccionar…</option>
                            {TIPOS_VEHICULO.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Nombre (opcional)">
                            <input
                                name="nombre"
                                value={form.nombre}
                                onChange={onChange}
                                className="w-full rounded-md border px-3 py-2 outline-none"
                                placeholder="Ej: Fiorino Blanca"
                            />
                        </Field>

                        <Field label="Patente *">
                            <input
                                name="patente"
                                value={form.patente}
                                onChange={onChange}
                                className="w-full rounded-md border px-3 py-2 outline-none"
                                placeholder="Ej: AAA111"
                            />
                        </Field>

                        <Field label="Marca *">
                            <input
                                name="marca"
                                value={form.marca}
                                onChange={onChange}
                                className="w-full rounded-md border px-3 py-2 outline-none"
                                placeholder="Ej: Fiat"
                            />
                        </Field>

                        <Field label="Modelo *">
                            <input
                                name="modelo"
                                value={form.modelo}
                                onChange={onChange}
                                className="w-full rounded-md border px-3 py-2 outline-none"
                                placeholder="Ej: Fiorino"
                            />
                        </Field>
                    </div>

                    <Field label="Datos adicionales (opcional)">
                        <textarea
                            name="adicionales"
                            value={form.adicionales}
                            onChange={onChange}
                            className="w-full rounded-md border px-3 py-2 outline-none min-h-[90px]"
                            placeholder="Ej: Año, color, capacidad, seguro, etc."
                        />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border bg-white hover:bg-slate-50 font-bold">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 rounded-md bg-blue-700 text-white font-bold hover:bg-blue-800">
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="space-y-1">
            <div className="text-sm font-bold text-slate-700">{label}</div>
            {children}
        </div>
    );
}