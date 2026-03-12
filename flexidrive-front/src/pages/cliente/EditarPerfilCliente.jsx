import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Mail, Phone, User, UserCircle2 } from "lucide-react";
import Loader from "../../components/Loader";
import {
  getMyProfile,
  updateMyProfile,
} from "../../services/profileService/profileService";

const LS_PROFILE_PHOTO_KEY = "flexidrive_profile_photo";

function safeValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EditarPerfilCliente() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [perfil, setPerfil] = useState(null);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  const [previewFoto, setPreviewFoto] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyProfile();
        if (!alive) return;

        setPerfil(data);
        setNombre(safeValue(data?.nombre));
        setApellido(safeValue(data?.apellido));
        setTelefono(safeValue(data?.telefono));
        setEmail(safeValue(data?.email));

        try {
          const savedPhoto = localStorage.getItem(LS_PROFILE_PHOTO_KEY) || "";
          setPreviewFoto(savedPhoto);
        } catch {
          setPreviewFoto("");
        }
      } catch (err) {
        if (!alive) return;

        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "No se pudieron cargar los datos del perfil."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      alive = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    if (!perfil) return false;

    return (
      nombre.trim() !== safeValue(perfil?.nombre).trim() ||
      apellido.trim() !== safeValue(perfil?.apellido).trim() ||
      telefono.trim() !== safeValue(perfil?.telefono).trim()
    );
  }, [perfil, nombre, apellido, telefono]);

  const handleChoosePhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Seleccioná un archivo de imagen válido.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      setPreviewFoto(dataUrl);
      localStorage.setItem(LS_PROFILE_PHOTO_KEY, dataUrl);
      setSuccess("Foto de perfil actualizada.");
      setError("");
    } catch {
      setError("No se pudo procesar la imagen.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!apellido.trim()) {
      setError("El apellido es obligatorio.");
      return;
    }

    if (!/^\d+$/.test(telefono.trim())) {
      setError("El teléfono debe contener solo números.");
      return;
    }

    if (telefono.trim().length !== 10) {
      setError("El teléfono debe tener exactamente 10 dígitos.");
      return;
    }

    try {
      setSaving(true);

      await updateMyProfile({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
      });

      setSuccess("Perfil actualizado correctamente.");

      setPerfil((prev) => ({
        ...prev,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
      }));

      setTimeout(() => {
        navigate("/cliente/datos");
      }, 900);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "No se pudo actualizar el perfil."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  if (error && !perfil) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <section>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
          Editar perfil
        </h1>
        <div className="mt-4 h-px w-full bg-slate-200" />
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-800">Foto de perfil</h2>

            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-blue-100 ring-4 ring-blue-50">
                {previewFoto ? (
                  <img
                    src={previewFoto}
                    alt="Vista previa"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="h-20 w-20 text-blue-700" strokeWidth={1.5} />
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleChoosePhoto}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-700 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  <Camera className="h-4 w-4" />
                  Cambiar foto
                </button>

                <p className="text-sm text-slate-500">
                  Formatos recomendados: JPG o PNG.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field>
              <Label icon={<User className="h-4 w-4 text-blue-700" />} text="Nombre" />
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingresá tu nombre"
              />
            </Field>

            <Field>
              <Label icon={<User className="h-4 w-4 text-blue-700" />} text="Apellido" />
              <Input
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ingresá tu apellido"
              />
            </Field>

            <Field>
              <Label icon={<Phone className="h-4 w-4 text-blue-700" />} text="Teléfono" />
              <Input
                value={telefono}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) setTelefono(value);
                }}
                inputMode="numeric"
                maxLength={10}
                placeholder="3531234567"
              />
            </Field>

            <Field>
              <Label icon={<Mail className="h-4 w-4 text-blue-700" />} text="Email" />
              <Input value={email} disabled readOnly />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/cliente/datos"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({ children }) {
  return <div className="space-y-2">{children}</div>;
}

function Label({ icon, text }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      {icon}
      <span>{text}</span>
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
        props.className || ""
      }`}
    />
  );
}