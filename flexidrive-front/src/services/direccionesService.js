//flexidrive-front\src\services\direccionesService.js
import { authApi } from "./api";

export async function getDirecciones() {
  const { data } = await authApi.get("/direcciones");
  return data;
}

export async function addDireccion(payload) {
  const { data } = await authApi.post("/direcciones", payload);
  return data;
}

export async function deleteDireccion(id) {
  const { data } = await authApi.delete(`/direcciones/${id}`);
  return data;
}