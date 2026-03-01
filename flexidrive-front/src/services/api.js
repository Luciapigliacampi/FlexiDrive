// src/services/api.js
import axios from "axios";

// Bases (por env o fallback)
export const AUTH_BASE =
  import.meta.env.VITE_AUTH_API || "http://localhost:3000/api/auth";

export const ENVIO_BASE =
  import.meta.env.VITE_ENVIO_API || "http://localhost:3001/api/envios";

// FIX: leer USE_MOCK una sola vez de forma consistente
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK || "false") === "true";

// Factory para crear instancias con el mismo comportamiento
function createApi(baseURL) {
  const instance = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Interceptor para agregar el token automáticamente
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Interceptor para manejar errores globales
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const status = error.response.status;

        // FIX: solo redirigir si NO estamos en modo mock, y SIEMPRE
        // rechazar la promise para que los catch de los servicios funcionen.
        if (status === 401 && !USE_MOCK) {
          localStorage.removeItem("token");
          localStorage.removeItem("rol");
          localStorage.removeItem("username");
          localStorage.removeItem("user");

          // Usamos replace para no agregar entrada al historial
          window.location.replace("/auth/login");
        }

        console.error("Error del servidor:", error.response.data);
      } else {
        console.error("Error de conexión:", error.message);
      }

      // FIX: siempre rechazar — nunca cortar la cadena de promises
      return Promise.reject(error);
    }
  );

  return instance;
}

// ✅ Instancias por microservicio
export const authApi = createApi(AUTH_BASE);
export const envioApi = createApi(ENVIO_BASE);

// Default export para compatibilidad con servicios viejos
export default authApi;
