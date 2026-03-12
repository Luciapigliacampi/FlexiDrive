import { useState } from "react";
import {
  Mail,
  Phone,
  Send,
  MessageSquareText,
  User,
} from "lucide-react";

export default function AyudaSoporte() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    asunto: "",
    consulta: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const subject = encodeURIComponent(
      `Consulta FlexiDrive: ${form.asunto}`
    );

    const body = encodeURIComponent(
`Nombre: ${form.nombre}
Email: ${form.email}
Teléfono: ${form.telefono}
Asunto: ${form.asunto}

Consulta:
${form.consulta}`
    );

    const mailtoLink = `mailto:hpigliacampi.hp@gmail.com?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <section>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
          Ayuda y soporte
        </h1>

        <div className="mt-4 h-px w-full bg-slate-200" />
      </section>

      {/* FORMULARIO */}
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-3">
          <MessageSquareText className="h-6 w-6 text-blue-700" />
          <h2 className="text-xl font-bold text-slate-800">
            Formulario de contacto
          </h2>
        </div>

        <p className="mt-2 text-sm text-slate-600">
          Si tenés alguna consulta o problema con un envío, completá el
          formulario y nuestro equipo te responderá lo antes posible.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4">

          {/* Nombre */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Nombre completo
            </label>

            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
              <User className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                placeholder="Tu nombre completo"
                className="w-full outline-none text-sm text-slate-700"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Email
            </label>

            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="tu@email.com"
                className="w-full outline-none text-sm text-slate-700"
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Teléfono
            </label>

            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="Ej: +54 3534 147796"
                className="w-full outline-none text-sm text-slate-700"
              />
            </div>
          </div>

          {/* Consulta */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Consulta
            </label>

            <div className="mt-1 space-y-2">
              <input
                type="text"
                name="asunto"
                value={form.asunto}
                onChange={handleChange}
                required
                placeholder="Asunto"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600"
              />

              <textarea
                name="consulta"
                value={form.consulta}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Escribí tu consulta..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Send className="h-4 w-4" />
              Enviar consulta
            </button>
          </div>
        </form>
      </section>

      {/* CONTACTO DIRECTO */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">
          También podés contactarnos directamente
        </h3>

        <div className="mt-4 space-y-3 text-slate-700">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-blue-700" />
            <span>+54 3534 147796</span>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-700" />
            <span>flexidrive@info.com.ar</span>
          </div>
        </div>
      </section>
    </main>
  );
}