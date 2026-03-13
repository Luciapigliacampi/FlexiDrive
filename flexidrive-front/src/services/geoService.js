// src/services/geoService.js
import axios from "axios";

const GEO_BASE = "https://apis.datos.gob.ar/georef/api";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
}

export async function getProvinciasAR() {
  const cacheKey = "geo_provincias_ar_v2";
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const res = await axios.get(`${GEO_BASE}/provincias`);
  const list = Array.isArray(res.data?.provincias) ? res.data.provincias : [];

  // {id, nombre}
  const normalized = list
  .map((p) => ({ id: String(p.id), nombre: p.nombre }))  // ← String()
  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  writeCache(cacheKey, normalized);
  return normalized;
}

export async function getLocalidadesByProvincia(provinciaId) {
  if (!provinciaId) return [];

  const cacheKey = `geo_localidades_ar_${provinciaId}_v2`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  // max=5000 para traer todas (localidades)
  const res = await axios.get(`${GEO_BASE}/localidades`, {
    params: { provincia: provinciaId, max: 5000 },
  });

   const list = Array.isArray(res.data?.localidades) ? res.data.localidades : [];
  
  console.log("georef localidad raw sample:", list[0]); // ← ver estructura completa
  
  const normalized = list
    .map((l) => ({ id: String(l.id), nombre: l.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  writeCache(cacheKey, normalized);
  return normalized;
}