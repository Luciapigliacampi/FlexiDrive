const LS_PROFILE_KEY = "mock_profile_cliente_v1";
const LS_DIRECCIONES_KEY = "mock_direcciones_cliente_v1";
const LS_DESTINATARIOS_KEY = "mock_destinatarios_cliente_v1";

const DEFAULT_PROFILE = {
  _id: "usr_mock_1",
  nombre: "Lucía",
  apellido: "Pigliacampi",
  email: "lucia@example.com",
  telefono: "3531234567",
  dni: "41411191",
  fecha_nacimiento: "1998-10-15",
  estado: "activo",
  rol: "cliente",
};

const DEFAULT_DIRECCIONES = [
  {
    id: "d1",
    alias: "Casa",
    direccion: "San Martín 100",
    pisoDepartamento: "2° A",
    ciudad: "Villa María",
    provincia: "Córdoba",
    cp: "5900",
    referencia: "",
  },
];

const DEFAULT_DESTINATARIOS = [
  {
    id: "c1",
    alias: "Mamá",
    apellido: "Pérez",
    nombre: "Laura",
    dni: "30111222",
    telefono: "3534000000",
    direccion: "San Martín 100",
    pisoDepartamento: "3° B",
    ciudad: "Villa María",
    provincia: "Córdoba",
    cp: "5900",
  },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function getMyProfile() {
  await wait(200);
  return readJSON(LS_PROFILE_KEY, DEFAULT_PROFILE);
}

export async function updateMyProfile(payload) {
  await wait(250);

  const current = readJSON(LS_PROFILE_KEY, DEFAULT_PROFILE);

  const next = {
    ...current,
    nombre: payload?.nombre ?? current.nombre,
    apellido: payload?.apellido ?? current.apellido,
    telefono: payload?.telefono ?? current.telefono,
  };

  writeJSON(LS_PROFILE_KEY, next);

  return {
    ok: true,
    usuario: next,
    rol: next.rol || "cliente",
  };
}

export async function getDirecciones() {
  await wait(200);
  return readJSON(LS_DIRECCIONES_KEY, DEFAULT_DIRECCIONES);
}

export async function addDireccion(payload) {
  await wait(250);
  const list = readJSON(LS_DIRECCIONES_KEY, DEFAULT_DIRECCIONES);
  const created = { id: `d_${Date.now()}`, ...payload };
  const next = [created, ...list];
  writeJSON(LS_DIRECCIONES_KEY, next);
  return created;
}

export async function deleteDireccion(id) {
  await wait(200);
  const list = readJSON(LS_DIRECCIONES_KEY, DEFAULT_DIRECCIONES);
  const next = list.filter((d) => String(d.id) !== String(id));
  writeJSON(LS_DIRECCIONES_KEY, next);
  return { ok: true };
}

export async function getDestinatarios() {
  await wait(200);
  return readJSON(LS_DESTINATARIOS_KEY, DEFAULT_DESTINATARIOS);
}

export async function addDestinatario(payload) {
  await wait(250);
  const list = readJSON(LS_DESTINATARIOS_KEY, DEFAULT_DESTINATARIOS);
  const created = { id: `c_${Date.now()}`, ...payload };
  const next = [created, ...list];
  writeJSON(LS_DESTINATARIOS_KEY, next);
  return created;
}

export async function deleteDestinatario(id) {
  await wait(200);
  const list = readJSON(LS_DESTINATARIOS_KEY, DEFAULT_DESTINATARIOS);
  const next = list.filter((d) => String(d.id) !== String(id));
  writeJSON(LS_DESTINATARIOS_KEY, next);
  return { ok: true };
}