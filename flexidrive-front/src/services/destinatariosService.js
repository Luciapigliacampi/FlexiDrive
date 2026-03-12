// flexidrive-front/src/services/destinatariosService.js
import { authApi } from "./api";

export async function getDestinatarios() {
  const { data } = await authApi.get("/api/auth/destinatarios");
  return data;
}

export async function addDestinatario(payload) {
  const { data } = await authApi.post("/api/auth/destinatarios", payload);
  return data;
}

export async function deleteDestinatario(id) {
  const { data } = await authApi.delete(`/api/auth/destinatarios/${id}`);
  return data;
}
