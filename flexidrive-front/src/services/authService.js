//flexidrive-front\src\services\authService.js
import api from "./api";

const AUTH_BASE = import.meta.env.VITE_AUTH_API_URL || "http://localhost:3000";

function formatApiError(err, fallback = "Ocurrió un error.") {
  const d = err?.response?.data;

  // Zod: { error: "Error de validación", detalles: [{campo, mensaje}, ...] }
  if (d?.error === "Error de validación" && Array.isArray(d?.detalles)) {
    return d.detalles.map((x) => `• ${x.campo}: ${x.mensaje}`).join("\n");
  }

  // Otros formatos comunes
  return d?.message || d?.error || err?.message || fallback;
}

// REGISTER
export const registerUser = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/register`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al registrarte."));
  }
};

// LOGIN PASO 1
export const loginUser = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/login`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al iniciar sesión."));
  }
};

// LOGIN PASO 2 (TOTP)
export const verifyTotp = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/verify-totp`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al verificar el código TOTP."));
  }
};

// GOOGLE LOGIN
export const loginWithGoogle = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/google`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error con Google Login."));
  }
};

// UPDATE PROFILE
export const updateProfile = async (data) => {
  try {
    const res = await api.put(`${AUTH_BASE}/api/auth/update-profile`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al actualizar perfil."));
  }
};

// COMPLETE COMISIONISTA (multipart)
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

// VEHICULOS
export const registerVehiculo = async (data) => {
  try {
    const res = await api.post(`${AUTH_BASE}/api/auth/register-vehiculo`, data);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al registrar vehículo."));
  }
};

export const getMyVehicles = async () => {
  try {
    const res = await api.get(`${AUTH_BASE}/api/auth/my-vehicles`);
    return res.data;
  } catch (err) {
    throw new Error(formatApiError(err, "Error al obtener vehículos."));
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