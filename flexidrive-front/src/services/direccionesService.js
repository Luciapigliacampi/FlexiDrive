// flexidrive-front/src/services/direccionesService.js
import { authApi } from "./api";

export async function getDirecciones() {
  const { data } = await authApi.get("/api/auth/direcciones");
  return data;
}

export async function addDireccion(payload) {
  const { data } = await authApi.post("/api/auth/direcciones", payload);
  return data;
}

export async function deleteDireccion(id) {
  const { data } = await authApi.delete(`/api/auth/direcciones/${id}`);
  return data;
}
