// src/services/destinatariosService.js
import { authApi } from "./api";

export async function getDestinatarios() {
  const { data } = await authApi.get("/destinatarios");
  return data;
}

export async function addDestinatario(payload) {
  const { data } = await authApi.post("/destinatarios", payload);
  return data;
}

export async function deleteDestinatario(id) {
  const { data } = await authApi.delete(`/destinatarios/${id}`);
  return data;
}