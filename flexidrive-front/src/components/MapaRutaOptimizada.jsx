// flexidrive-front/src/components/MapaRutaOptimizada.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import {
  CheckCircle2, Clock, MapPin, RotateCcw,
  X, Calendar, ChevronRight, Truck,
  Navigation, LocateFixed, ChevronDown, ChevronUp, Pencil,
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

function getTodayISO() { return getTodayString(); }

/* ─── Esperar a que window.google.maps esté listo ─── */
async function waitForGoogleMaps(maxMs = 10000) {
  if (!window.google?.maps?.Map && !document.querySelector("#gmaps-script")) {
    const script = document.createElement("script");
    script.id  = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=marker,geometry,places&loading=async`;
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

/* ─── Obtener GPS ─── */
function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("GPS no disponible en este dispositivo."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(
        err.code === 1 ? "Permiso de ubicación denegado." :
        err.code === 2 ? "No se pudo determinar la ubicación." :
        "Tiempo de espera agotado."
      )),
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

/* ══════════════════════════════════════════════
   COMPONENTE
══════════════════════════════════════════════ */
export default function MapaRutaOptimizada({
  ruta,
  onConfirmarRetiro,
  onRegenerar,
  onUbicacionChange,
  viajeIniciado,
}) {
  const mapRef           = useRef(null);
  const mapInstance      = useRef(null);
  const markersRef       = useRef([]);
  const polylineRef      = useRef(null);
  const markerPartidaRef = useRef(null);
  const autocompleteInputRef = useRef(null);
  const autocompleteRef      = useRef(null);

  const [mapReady,         setMapReady]         = useState(false);
  const [errorAccion,      setErrorAccion]      = useState("");
  const [modalRetiro,      setModalRetiro]      = useState(null);
  const [fechaRetiroInput, setFechaRetiroInput] = useState("");
  const [loadingRetiro,    setLoadingRetiro]    = useState(false);

  // ── Punto de partida ──
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [ubicacion,    setUbicacion]    = useState(null); // { lat, lng, texto }
  const [gpsLoading,   setGpsLoading]   = useState(false);
  const [gpsError,     setGpsError]     = useState("");
  const [modoManual,   setModoManual]   = useState(false);
  const [addressInput, setAddressInput] = useState("");

  const paradas              = ruta?.orden_entregas || [];
  const pendientes           = paradas.filter(p => !p.completada);
  const completadas          = paradas.filter(p => p.completada);
  const hayParadasCompletadas = completadas.length > 0;

  /* ── Helper: nueva ubicación manual → notifica y re-optimiza si viaje iniciado ── */
  const handleNuevaUbicacion = useCallback((pos, texto) => {
    setUbicacion({ ...pos, texto });
    onUbicacionChange?.({ lat: pos.lat, lng: pos.lng });
    if (viajeIniciado && onRegenerar) {
      onRegenerar({ lat: pos.lat, lng: pos.lng });
    }
  }, [onUbicacionChange, onRegenerar, viajeIniciado]);

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
        if (!cancelled) setMapReady(true);
      } catch (e) { console.error("initMap:", e); }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── 2. GPS automático al montar ── */
  useEffect(() => {
    (async () => {
      setGpsLoading(true);
      setGpsError("");
      try {
        const pos = await getGPS();
        setUbicacion({ ...pos, texto: "Mi ubicación actual (GPS)" });
        onUbicacionChange?.({ lat: pos.lat, lng: pos.lng });
        setPanelOpen(false);
      } catch (e) {
        setGpsError(e.message);
      } finally {
        setGpsLoading(false);
      }
    })();
  // onUbicacionChange es estable (useCallback en padre) — omitir para que
  // el efecto solo corra al montar y no repetir el GPS en cada render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 2b. Sincronizar marcador con última parada completada ── */
  useEffect(() => {
    if (!ruta?.lat_inicio || !ruta?.lng_inicio) return;
    if (!hayParadasCompletadas) return;
    // Solo actualizar visualmente — NO llamar handleNuevaUbicacion
    // para no disparar una re-optimización extra (el backend ya la hizo)
    setUbicacion({
      lat: ruta.lat_inicio,
      lng: ruta.lng_inicio,
      texto: "Última parada completada",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta?.lat_inicio, ruta?.lng_inicio]);

  /* ── 3. Autocomplete de Google Places ── */
  useEffect(() => {
    if (!mapReady || !modoManual || !autocompleteInputRef.current) return;
    if (autocompleteRef.current) return;

    try {
      const options = {
        componentRestrictions: { country: "ar" },
        fields: ["geometry", "formatted_address"],
        strictBounds: false,
      };

      // Sesgar autocomplete hacia la ubicación actual si está disponible
      if (ubicacion?.lat && ubicacion?.lng) {
        const radiusInDeg = 0.5; // ~55km
        options.bounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(ubicacion.lat - radiusInDeg, ubicacion.lng - radiusInDeg),
          new window.google.maps.LatLng(ubicacion.lat + radiusInDeg, ubicacion.lng + radiusInDeg)
        );
      }

      const ac = new window.google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        options
      );

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        handleNuevaUbicacion({ lat, lng }, place.formatted_address);
        setAddressInput(place.formatted_address);
        setModoManual(false);
      });
      autocompleteRef.current = ac;
    } catch (e) {
      console.warn("Autocomplete error:", e);
    }
  }, [mapReady, modoManual, onUbicacionChange, ubicacion?.lat, ubicacion?.lng, handleNuevaUbicacion]);

  /* ── 4. Marcador de partida draggable ── */
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !ubicacion) return;

    if (markerPartidaRef.current) {
      try {
        markerPartidaRef.current.setMap
          ? markerPartidaRef.current.setMap(null)
          : (markerPartidaRef.current.map = null);
      } catch { /* */ }
      markerPartidaRef.current = null;
    }

    (async () => {
      let AdvancedMarkerElement = null;
      try {
        if (window.google.maps.importLibrary) {
          const lib = await window.google.maps.importLibrary("marker");
          AdvancedMarkerElement = lib.AdvancedMarkerElement;
        }
      } catch { /* legacy */ }

      const pos = { lat: ubicacion.lat, lng: ubicacion.lng };
      const draggable = !hayParadasCompletadas;

      if (AdvancedMarkerElement) {
        const pin = document.createElement("div");
        pin.style.cssText = `
          background:#0f172a;color:#fff;border-radius:50%;width:34px;height:34px;
          display:flex;align-items:center;justify-content:center;
          border:3px solid #38bdf8;box-shadow:0 2px 8px rgba(0,0,0,.4);
          cursor:${draggable ? "grab" : "default"};font-size:16px;
        `;
        pin.textContent = "🚚";
        pin.title = draggable ? "Arrastrá para cambiar el punto de partida" : "Última posición conocida";

        markerPartidaRef.current = new AdvancedMarkerElement({
          position: pos,
          map: mapInstance.current,
          title: "Punto de partida",
          content: pin,
          gmpDraggable: draggable,
          zIndex: 100,
        });

        if (draggable) {
          markerPartidaRef.current.addListener("dragend", (e) => {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            handleNuevaUbicacion(
              { lat: newLat, lng: newLng },
              "Posición personalizada (arrastrado)"
            );
          });
        }
      } else {
        markerPartidaRef.current = new window.google.maps.Marker({
          position: pos,
          map: mapInstance.current,
          title: "Punto de partida",
          draggable,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#0f172a",
            fillOpacity: 1,
            strokeColor: "#38bdf8",
            strokeWeight: 3,
          },
          zIndex: 100,
        });

        if (draggable) {
          markerPartidaRef.current.addListener("dragend", (e) => {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            handleNuevaUbicacion(
              { lat: newLat, lng: newLng },
              "Posición personalizada (arrastrado)"
            );
          });
        }
      }

      mapInstance.current.panTo(pos);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, ubicacion?.lat, ubicacion?.lng]);

  /* ── 5. Dibujar paradas ── */
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !ruta) return;
    let cancelled = false;

    (async () => {
      markersRef.current.forEach(m => { try { m.setMap ? m.setMap(null) : (m.map = null); } catch { /* */ } });
      markersRef.current = [];
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }

      if (ruta.polyline) {
        const path = decodePolyline(ruta.polyline);
        if (!cancelled) {
          polylineRef.current = new window.google.maps.Polyline({
            path, geodesic: true, strokeColor: "#1d4ed8", strokeOpacity: 0.8, strokeWeight: 4,
            map: mapInstance.current,
          });
          const bounds = new window.google.maps.LatLngBounds();
          path.forEach(p => bounds.extend(p));
          if (ubicacion) bounds.extend({ lat: ubicacion.lat, lng: ubicacion.lng });
          mapInstance.current.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
        }
      } else {
        const bounds = new window.google.maps.LatLngBounds();
        paradas.forEach(p => { if (p.lat && p.lng) bounds.extend({ lat: p.lat, lng: p.lng }); });
        if (ubicacion) bounds.extend({ lat: ubicacion.lat, lng: ubicacion.lng });
        if (!bounds.isEmpty()) mapInstance.current.fitBounds(bounds, 60);
      }

      if (cancelled) return;

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
        const info = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family:sans-serif;padding:4px 2px;min-width:180px">
              <div style="font-weight:700;font-size:13px;color:${col.bg}">${col.label} — Envío #${parada.nro_envio}</div>
              <div style="font-size:12px;color:#475569;margin-top:4px">${parada.texto || ""}</div>
              ${parada.franja_horaria ? `<div style="font-size:11px;color:#64748b;margin-top:4px">🕐 ${parada.franja_horaria}</div>` : ""}
              ${parada.completada ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px">✔ Completada</div>` : ""}
            </div>
          `,
        });

        let marker;
        if (AdvancedMarkerElement) {
          const pin = document.createElement("div");
          pin.style.cssText = `background:${col.bg};opacity:${parada.completada ? 0.4 : 1};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;`;
          pin.textContent = String(parada.orden);
          marker = new AdvancedMarkerElement({
            position: { lat: parada.lat, lng: parada.lng },
            map: mapInstance.current,
            title: `#${parada.nro_envio}`,
            content: pin,
            zIndex: parada.completada ? 1 : 10,
          });
        } else {
          marker = new window.google.maps.Marker({
            position: { lat: parada.lat, lng: parada.lng },
            map: mapInstance.current,
            title: `#${parada.nro_envio}`,
            label: { text: String(parada.orden), color: "#fff", fontSize: "11px", fontWeight: "bold" },
            zIndex: parada.completada ? 1 : 10,
          });
        }
        marker.addListener("click", () => info.open(mapInstance.current, marker));
        markersRef.current.push(marker);
      });
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, ruta, paradas]);

  /* ── Handlers ── */
  const handleGPS = useCallback(async () => {
    setGpsLoading(true);
    setGpsError("");
    try {
      const pos = await getGPS();
      handleNuevaUbicacion(pos, "Mi ubicación actual (GPS)");
      setPanelOpen(false);
    } catch (e) {
      setGpsError(e.message);
    } finally {
      setGpsLoading(false);
    }
  }, [handleNuevaUbicacion]);

  const handleRegenerar = useCallback(() => {
    if (!onRegenerar) return;
    onRegenerar(ubicacion ? { lat: ubicacion.lat, lng: ubicacion.lng } : null);
  }, [onRegenerar, ubicacion]);

  const handleGuardarRetiro = useCallback(async () => {
    if (!modalRetiro || !onConfirmarRetiro) return;
    setLoadingRetiro(true);
    try {
      await onConfirmarRetiro(modalRetiro.envioId, fechaRetiroInput);
      setModalRetiro(null);
    } catch (e) {
      setErrorAccion(e?.message || "Error al confirmar fecha de retiro.");
    } finally {
      setLoadingRetiro(false);
    }
  }, [modalRetiro, fechaRetiroInput, onConfirmarRetiro]);

  if (!ruta) return null;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Panel punto de partida: solo si NO hay paradas completadas ── */}
      {!hayParadasCompletadas ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setPanelOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Navigation className="w-4 h-4 text-blue-700" />
              Punto de partida
              {ubicacion && (
                <span className="ml-1 text-xs font-normal text-slate-500 truncate max-w-[200px]">
                  — {ubicacion.texto}
                </span>
              )}
            </div>
            {panelOpen
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />
            }
          </button>

          {panelOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleGPS}
                disabled={gpsLoading}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-60 transition"
              >
                <LocateFixed className="w-4 h-4" />
                {gpsLoading ? "Obteniendo ubicación..." : "Usar mi ubicación actual (GPS)"}
              </button>

              {gpsError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {gpsError}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex-1 h-px bg-slate-200" /> o ingresá una dirección <div className="flex-1 h-px bg-slate-200" />
              </div>

              {modoManual ? (
                <div className="relative">
                  <input
                    ref={autocompleteInputRef}
                    type="text"
                    value={addressInput}
                    onChange={e => setAddressInput(e.target.value)}
                    placeholder="Escribí una dirección..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setModoManual(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setModoManual(true); setAddressInput(""); autocompleteRef.current = null; }}
                  className="w-full flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-sm px-4 py-2.5 transition"
                >
                  <Pencil className="w-4 h-4 text-slate-400" />
                  {ubicacion ? "Cambiar dirección manualmente" : "Ingresar dirección manualmente"}
                </button>
              )}

              {ubicacion && (
                <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  <span>🚚</span>
                  También podés arrastrar el marcador azul en el mapa para ajustar la posición.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── Indicador de solo lectura cuando ya hay paradas completadas ── */
        ubicacion && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
            <Navigation className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-600">Última posición:</span>
            <span className="truncate">{ubicacion.texto}</span>
          </div>
        )
      )}

      {/* ── Mapa ── */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 340 }}>
        <div ref={mapRef} className="w-full h-full bg-slate-100" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm bg-slate-100">
            Cargando mapa...
          </div>
        )}
        {(ruta.distancia_total_km || ruta.tiempo_estimado_min) && (
          <div className="absolute top-3 left-3 flex gap-2">
            {ruta.distancia_total_km && (
              <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full shadow border border-slate-200">
                📍 {ruta.distancia_total_km.toFixed(1)} km
              </span>
            )}
            {ruta.tiempo_estimado_min && (
              <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full shadow border border-slate-200">
                ⏱ {Math.round(ruta.tiempo_estimado_min)} min
              </span>
            )}
          </div>
        )}
        {onRegenerar && (
          <button
            type="button"
            onClick={handleRegenerar}
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-1.5 transition"
          >
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
      <div className="flex gap-4 flex-wrap">
        {Object.entries(COLORES).map(([tipo, c]) => (
          <div key={tipo} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span className={`h-3 w-3 rounded-full ${c.badge}`} /> {c.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <span className="h-3 w-3 rounded-full bg-slate-800 border-2 border-sky-400" /> Partida
        </div>
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
              return (
                <div key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow transition">
                  <div className={`mt-0.5 h-6 w-6 shrink-0 rounded-full text-white flex items-center justify-center text-xs font-bold ${col.badge}`}>
                    {parada.orden}
                  </div>
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
                  </div>
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
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700" /> Confirmar día de retiro
              </h3>
              <button type="button" onClick={() => setModalRetiro(null)} className="rounded-md p-1.5 hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="text-sm text-slate-600">
                Envío <span className="font-bold text-slate-800">#{modalRetiro.nro_envio}</span>
              </div>
              {modalRetiro.franja && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>El cliente estará disponible de <strong>{modalRetiro.franja}</strong></span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">¿Qué día vas a retirar?</label>
                <input
                  type="date"
                  value={fechaRetiroInput}
                  min={getTodayISO()}
                  onChange={e => setFechaRetiroInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalRetiro(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!fechaRetiroInput || loadingRetiro}
                onClick={handleGuardarRetiro}
                className="rounded-lg bg-blue-700 hover:bg-blue-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {loadingRetiro ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
