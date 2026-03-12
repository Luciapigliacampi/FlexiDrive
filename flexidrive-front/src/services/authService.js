// flexidrive-front/src/services/authService.js
import api from "./api";

const AUTH_BASE = import.meta.env.VITE_AUTH_API_URL || "http://localhost:3000";

// FIX: default "true" para que coincida con comisionistaServices/index.js
// Si VITE_USE_MOCK no está en .env, ambos archivos usan mock.
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK || "true") === "true";

// ✅ Mock vehicles para modo mock
const VEHICULOS_MOCK = [
  { _id: "veh_1", marca: "Fiat", modelo: "Fiorino", patente: "AAA111" },
  { _id: "veh_2", marca: "Renault", modelo: "Kangoo", patente: "BBB222" },
];

const LS_KEY = "vehiculos_mock_v1";

function mockRead() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [...VEHICULOS_MOCK];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...VEHICULOS_MOCK];
  } catch {
    return [...VEHICULOS_MOCK];
  }
}

function mockWrite(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function formatApiError(err, fallback = "Ocurrió un error.") {
  const d = err?.response?.data;

  if (d?.error === "Error de validación" && Array.isArray(d?.detalles)) {
    return d.detalles.map((x) => `• ${x.campo}: ${x.mensaje}`).join("\n");
  }

  return d?.message || d?.error || err?.message || fallback;
}

// ─── VEHICULOS ────────────────────────────────────────────────────────────────

export const getMyVehicles = async () => {
  try {
    if (USE_MOCK) {
      // FIX: usar mockRead() para que los cambios hechos en la sesión persistan
      return mockRead();
    }
    const res = await api.get(`${AUTH_BASE}/api/auth/my-vehicles`);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al obtener vehículos."));
  }
};

export const registerVehiculo = async (data) => {
  try {
    if (USE_MOCK) {
      const list = mockRead();
      const nuevo = { _id: `veh_${Date.now()}`, ...data };
      const next = [nuevo, ...list];
      mockWrite(next);
      return nuevo;
    }
    const res = await api.post(`${AUTH_BASE}/api/auth/register-vehiculo`, data);
    // backend devuelve { message, vehiculo } — extraemos el objeto del vehículo
    return res.data?.vehiculo ?? res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al registrar vehículo."));
  }
};

export const updateVehiculo = async (vehiculoId, data) => {
  try {
    if (USE_MOCK) {
      const list = mockRead();
      const next = list.map((v) =>
        String(v._id) === String(vehiculoId) ? { ...v, ...data } : v
      );
      mockWrite(next);
      return next.find((v) => String(v._id) === String(vehiculoId));
    }
    const res = await api.put(`${AUTH_BASE}/api/auth/vehicles/${vehiculoId}`, data);
    return res.data?.vehiculo ?? res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al actualizar vehículo."));
  }
};

export const deleteVehiculo = async (vehiculoId) => {
  try {
    if (USE_MOCK) {
      const list = mockRead();
      const next = list.filter((v) => String(v._id) !== String(vehiculoId));
      mockWrite(next);
      return { ok: true };
    }
    const res = await api.delete(`${AUTH_BASE}/api/auth/vehicles/${vehiculoId}`);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al eliminar vehículo."));
  }
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const registerUser = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/register`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al registrarte."));
  }
};

export const loginUser = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/login`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al iniciar sesión."));
  }
};

export const verifyTotp = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/verify-totp`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al verificar el código TOTP."));
  }
};

export const loginWithGoogle = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/google`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error con Google Login."));
  }
};

export const updateProfile = async (data) => {
  try {
    const tempToken = localStorage.getItem("tempToken") || "";
    const res = await api.put(`${AUTH_BASE}/api/auth/update-profile`, data, {
      headers: {
        Authorization: `Bearer ${tempToken}`,
      },
    });
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al actualizar perfil."));
  }
};

export const completeComisionista = async (formData) => {
  try {
    const res = await api.put(`${AUTH_BASE}/api/auth/complete-comisionista`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al completar datos de comisionista."));
  }
};

export const completeComisionistaTemp = async (formData) => {
  try {
    const tempToken = localStorage.getItem("tempToken") || "";
    const res = await api.put(`${AUTH_BASE}/api/auth/complete-comisionista-temp`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${tempToken}`,
      },
    });
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al completar datos de comisionista."));
  }
};

export const enableTotp = async ({ userId }) => {
  const res = await api.post(`${AUTH_BASE}/api/auth/enable-totp`, { userId });
  return res.data;
};

export const confirmTotp = async ({ userId, codigoIngresado }) => {
  const res = await api.post(`${AUTH_BASE}/api/auth/confirm-totp`, { userId, codigoIngresado });
  return res.data;
};
