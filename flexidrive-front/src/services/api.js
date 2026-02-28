// src/services/api.js
import axios from "axios";

// Bases (por env o fallback)
export const AUTH_BASE =
  import.meta.env.VITE_AUTH_API || "http://localhost:3000/api/auth";

export const ENVIO_BASE =
  import.meta.env.VITE_ENVIO_API || "http://localhost:3001/api/envios";

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

        // Si expira el token o es inválido
        if (status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("rol");
          localStorage.removeItem("username");
          localStorage.removeItem("user");

          
          window.location.href = "/auth/login";
        }

        console.error("Error del servidor:", error.response.data);
      } else {
        console.error("Error de conexión:", error.message);
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

// ✅ Instancias por microservicio
export const authApi = createApi(AUTH_BASE);
export const envioApi = createApi(ENVIO_BASE);

// (Opcional) default export para mantener compatibilidad
// Si tenés servicios viejos que importan `api` sin baseURL,
// devolvemos el de auth (o el que más uses).
export default authApi;