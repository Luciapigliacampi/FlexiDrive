// flexidrive-front/src/components/MapaRutaOptimizada.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import {
  CheckCircle2, Clock, MapPin, RotateCcw,
  X, Calendar, ChevronRight, Truck,
} from "lucide-react";
import { getTodayString } from "../utils/testDate";

/* ─── Decode polyline de Google ─── */
function decodePolyline(encoded) {
  const poly = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

/* ─── Colores por tipo ─── */
const COLORES = {
  RETIRO:  { bg: "#1d4ed8", badge: "bg-blue-700",   text: "text-blue-700",    label: "Retiro"  },
  ENTREGA: { bg: "#059669", badge: "bg-emerald-600", text: "text-emerald-700", label: "Entrega" },
  RETORNO: { bg: "#dc2626", badge: "bg-red-600",     text: "text-red-700",     label: "Retorno" },
};

function formatFecha(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function getTodayISO() {
  return getTodayString();
}

/* ─── Esperar a que window.google.maps esté listo ─── */
async function waitForGoogleMaps(maxMs = 10000) {
  // Inyectar el script si todavía no existe
  if (!window.google?.maps?.Map && !document.querySelector("#gmaps-script")) {
    const script = document.createElement("script");
    script.id  = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=marker,geometry&loading=async`;
    document.head.appendChild(script);
  }

  if (window.google?.maps?.Map) return;
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const id = setInterval(() => {
      if (window.google?.maps?.Map)      { clearInterval(id); resolve(); }
      else if (Date.now()-start > maxMs) { clearInterval(id); reject(new Error("Google Maps no cargó.")); }
    }, 100);
  });
}

/* ══════════════════════════════════════════════
   COMPONENTE
══════════════════════════════════════════════ */
export default function MapaRutaOptimizada({ ruta, onCompletar, onConfirmarRetiro, onRegenerar }) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef([]);
  const polylineRef = useRef(null);

  // mapReady evita el race condition: drawRuta espera a que el mapa exista
  const [mapReady,      setMapReady]      = useState(false);
  const [loadingAccion, setLoadingAccion] = useState(null);
  const [errorAccion,   setErrorAccion]   = useState("");
  const [modalRetiro,      setModalRetiro]      = useState(null);
  const [fechaRetiroInput, setFechaRetiroInput] = useState(getTodayISO());
  const [loadingRetiro,    setLoadingRetiro]    = useState(false);

  const paradas     = ruta?.orden_entregas || [];
  const pendientes  = paradas.filter(p => !p.completada);
  const completadas = paradas.filter(p => p.completada);

  /* ── 1. Inicializar mapa ── */
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await waitForGoogleMaps();
        if (cancelled || mapInstance.current) return;

        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          zoom: 10,
          center: { lat: -31.4, lng: -64.18 },
          mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
          mapId: "flexidrive_ruta",
        });

        if (!cancelled) setMapReady(true); // ← avisa a drawRuta
      } catch (e) {
        console.error("initMap:", e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /* ── 2. Dibujar — corre cuando mapReady cambia a true O cuando ruta cambia ── */
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !ruta) return;
    let cancelled = false;

    (async () => {
      // Limpiar previos
      markersRef.current.forEach(m => { try { m.setMap ? m.setMap(null) : (m.map = null); } catch { /* */ } });
      markersRef.current = [];
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }

      // Polyline
      if (ruta.polyline) {
        const path = decodePolyline(ruta.polyline);
        if (!cancelled) {
          polylineRef.current = new window.google.maps.Polyline({
            path, geodesic: true, strokeColor: "#1d4ed8", strokeOpacity: 0.8, strokeWeight: 4,
            map: mapInstance.current,
          });
          const bounds = new window.google.maps.LatLngBounds();
          path.forEach(p => bounds.extend(p));
          mapInstance.current.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
        }
      } else {
        // Sin polyline: centrar en paradas
        const bounds = new window.google.maps.LatLngBounds();
        paradas.forEach(p => { if (p.lat && p.lng) bounds.extend({ lat: p.lat, lng: p.lng }); });
        if (!bounds.isEmpty()) mapInstance.current.fitBounds(bounds, 60);
      }

      if (cancelled) return;

      // Markers
      let AdvancedMarkerElement = null;
      try {
        if (window.google.maps.importLibrary) {
          const lib = await window.google.maps.importLibrary("marker");
          AdvancedMarkerElement = lib.AdvancedMarkerElement;
        }
      } catch { /* legacy */ }

      if (cancelled) return;

      paradas.forEach(parada => {
        if (!parada.lat || !parada.lng) return;
        const col = COLORES[parada.tipo] || COLORES.ENTREGA;
        const info = new window.google.maps.InfoWindow({ content: `
          <div style="font-family:sans-serif;padding:4px 2px;min-width:180px">
            <div style="font-weight:700;font-size:13px;color:${col.bg}">${col.label} — Envío #${parada.nro_envio}</div>
            <div style="font-size:12px;color:#475569;margin-top:4px">${parada.texto || ""}</div>
            ${parada.franja_horaria ? `<div style="font-size:11px;color:#64748b;margin-top:4px">🕐 ${parada.franja_horaria}</div>` : ""}
            ${parada.fecha_retiro_confirmada ? `<div style="font-size:11px;color:#059669;margin-top:2px">✅ Retiro: ${formatFecha(parada.fecha_retiro_confirmada)}</div>` : ""}
            ${parada.completada ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px">✔ Completada</div>` : ""}
          </div>`
        });

        let marker;
        if (AdvancedMarkerElement) {
          const pin = document.createElement("div");
          pin.style.cssText = `background:${col.bg};opacity:${parada.completada ? 0.4 : 1};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;`;
          pin.textContent = String(parada.orden);
          marker = new AdvancedMarkerElement({
            position: { lat: parada.lat, lng: parada.lng },
            map: mapInstance.current, title: `#${parada.nro_envio}`, content: pin,
            zIndex: parada.completada ? 1 : 10,
          });
        } else {
          marker = new window.google.maps.Marker({
            position: { lat: parada.lat, lng: parada.lng },
            map: mapInstance.current, title: `#${parada.nro_envio}`,
            label: { text: String(parada.orden), color: "#fff", fontSize: "11px", fontWeight: "bold" },
            zIndex: parada.completada ? 1 : 10,
          });
        }
        marker.addListener("click", () => info.open(mapInstance.current, marker));
        markersRef.current.push(marker);
      });
    })();

    return () => { cancelled = true; };
  }, [mapReady, ruta, paradas]); // ← depende de mapReady

  /* ── Handlers ── */
  const handleCompletar = useCallback(async (parada) => {
    if (!onCompletar) return;
    const key = `${parada.envioId}_${parada.tipo}`;
    setLoadingAccion(key); setErrorAccion("");
    try { await onCompletar(parada.envioId, parada.tipo, {}); }
    catch (e) { setErrorAccion(e?.message || "Error al completar la parada."); }
    finally { setLoadingAccion(null); }
  }, [onCompletar]);

  const handleGuardarRetiro = useCallback(async () => {
    if (!modalRetiro || !onConfirmarRetiro) return;
    setLoadingRetiro(true);
    try { await onConfirmarRetiro(modalRetiro.envioId, fechaRetiroInput); setModalRetiro(null); }
    catch (e) { setErrorAccion(e?.message || "Error al confirmar fecha de retiro."); }
    finally { setLoadingRetiro(false); }
  }, [modalRetiro, fechaRetiroInput, onConfirmarRetiro]);

  if (!ruta) return null;

  return (
    <div className="flex flex-col gap-4">

      {/* Mapa */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 340 }}>
        <div ref={mapRef} className="w-full h-full bg-slate-100" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm bg-slate-100">
            Cargando mapa...
          </div>
        )}
        {(ruta.distancia_total_km || ruta.tiempo_estimado_min) && (
          <div className="absolute top-3 left-3 flex gap-2">
            {ruta.distancia_total_km && <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full shadow border border-slate-200">📍 {ruta.distancia_total_km.toFixed(1)} km</span>}
            {ruta.tiempo_estimado_min && <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full shadow border border-slate-200">⏱ {Math.round(ruta.tiempo_estimado_min)} min</span>}
          </div>
        )}
        {onRegenerar && (
          <button type="button" onClick={onRegenerar}
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-1.5 transition">
            <RotateCcw className="w-3.5 h-3.5" /> Re-optimizar
          </button>
        )}
      </div>

      {/* Error */}
      {errorAccion && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>{errorAccion}</span>
          <button onClick={() => setErrorAccion("")} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex gap-4">
        {Object.entries(COLORES).map(([tipo, c]) => (
          <div key={tipo} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span className={`h-3 w-3 rounded-full ${c.badge}`} /> {c.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 ml-auto">
          <span className="h-3 w-3 rounded-full bg-slate-300" /> Completada
        </div>
      </div>

      {/* Paradas pendientes */}
      {pendientes.length > 0 && (
        <div>
          <div className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Truck className="w-4 h-4" /> Paradas pendientes ({pendientes.length})
          </div>
          <div className="space-y-2">
            {pendientes.map(parada => {
              const col = COLORES[parada.tipo] || COLORES.ENTREGA;
              const key = `${parada.envioId}_${parada.tipo}`;
              const isLoading = loadingAccion === key;
              return (
                <div key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow transition">
                  <div className={`mt-0.5 h-6 w-6 shrink-0 rounded-full text-white flex items-center justify-center text-xs font-bold ${col.badge}`}>{parada.orden}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold uppercase tracking-wide ${col.text}`}>{col.label}</span>
                      <span className="text-xs font-semibold text-slate-500">Envío #{parada.nro_envio}</span>
                    </div>
                    <div className="text-sm text-slate-700 mt-0.5 truncate">
                      <MapPin className="inline w-3 h-3 mr-1 text-slate-400" />{parada.texto || "—"}
                    </div>
                    {parada.tipo === "RETIRO" && parada.franja_horaria && (
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Disponible: <span className="font-semibold">{parada.franja_horaria}</span>
                      </div>
                    )}
                    {/* {parada.tipo === "RETIRO" && (
                      <div className="mt-1.5">
                        {parada.fecha_retiro_confirmada ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                            <Calendar className="w-3 h-3" />
                            Retiro confirmado: {formatFecha(parada.fecha_retiro_confirmada)}
                            <button type="button" onClick={() => { setModalRetiro({ envioId: parada.envioId, nro_envio: parada.nro_envio, franja: parada.franja_horaria }); setFechaRetiroInput(getTodayISO()); }} className="ml-1 text-blue-600 hover:underline">(cambiar)</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setModalRetiro({ envioId: parada.envioId, nro_envio: parada.nro_envio, franja: parada.franja_horaria }); setFechaRetiroInput(getTodayISO()); }}
                            className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">
                            <Calendar className="w-3 h-3" /> Confirmar día de retiro
                          </button>
                        )}
                      </div>
                    )} */}
                  </div>
                  {/* <button type="button" disabled={isLoading} onClick={() => handleCompletar(parada)}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 px-3 py-1.5 text-xs font-bold transition disabled:opacity-50">
                    {isLoading ? <span className="animate-spin">⟳</span> : <CheckCircle2 className="w-4 h-4" />}
                    <span className="hidden sm:inline">{isLoading ? "..." : "Completar"}</span>
                  </button> */}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completadas */}
      {completadas.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-400 flex items-center gap-2 select-none list-none">
            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" /> Completadas ({completadas.length})
          </summary>
          <div className="mt-2 space-y-1.5 pl-2">
            {completadas.map(parada => {
              const col = COLORES[parada.tipo] || COLORES.ENTREGA;
              return (
                <div key={`${parada.envioId}_${parada.tipo}_done`} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 opacity-60">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className={`text-xs font-bold uppercase ${col.text} opacity-70`}>{col.label}</span>
                  <span className="text-xs text-slate-500 truncate">#{parada.nro_envio} — {parada.texto}</span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Modal confirmar retiro */}
      {modalRetiro && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setModalRetiro(null)} aria-label="Cerrar" />
          <div className="relative z-[1000] w-[92vw] max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-700" /> Confirmar día de retiro</h3>
              <button type="button" onClick={() => setModalRetiro(null)} className="rounded-md p-1.5 hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="text-sm text-slate-600">Envío <span className="font-bold text-slate-800">#{modalRetiro.nro_envio}</span></div>
              {modalRetiro.franja && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>El cliente estará disponible de <strong>{modalRetiro.franja}</strong></span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">¿Qué día vas a retirar?</label>
                <input type="date" value={fechaRetiroInput} min={getTodayISO()} onChange={e => setFechaRetiroInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 text-sm" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={() => setModalRetiro(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="button" disabled={!fechaRetiroInput || loadingRetiro} onClick={handleGuardarRetiro}
                className="rounded-lg bg-blue-700 hover:bg-blue-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {loadingRetiro ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
