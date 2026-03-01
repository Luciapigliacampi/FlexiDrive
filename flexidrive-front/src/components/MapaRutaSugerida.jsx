import { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polyline,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

const GMAPS_KEY      = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const COLOR_RETIRO   = "#1d4ed8";
const COLOR_ENTREGA  = "#059669";
const COLOR_RETORNO  = "#dc2626";
const CENTER_DEFAULT = { lat: -32.4098, lng: -63.2386 };

function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function colorPorTipo(tipo) {
  if (!tipo) return COLOR_ENTREGA;
  const t = tipo.toUpperCase();
  if (t === "RETIRO")  return COLOR_RETIRO;
  if (t === "RETORNO") return COLOR_RETORNO;
  return COLOR_ENTREGA;
}

export default function MapaRutaSugerida({ ruta }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GMAPS_KEY,
    language: "es",
    region:   "ar",
  });

  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);

  const paradas  = ruta?.orden_entregas || [];
  const polyline = ruta?.polyline       || null;
  const path     = polyline ? decodePolyline(polyline) : [];

  useEffect(() => {
    if (!mapRef.current || paradas.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    paradas.forEach((p) => {
      if (p.lat && p.lng) bounds.extend({ lat: p.lat, lng: p.lng });
    });
    mapRef.current.fitBounds(bounds, 40);
  }, [paradas]);

  if (!isLoaded) {
    return (
      <div className="h-[260px] w-full grid place-items-center text-slate-400 bg-slate-100 rounded-xl">
        Cargando mapa...
      </div>
    );
  }

  const center = paradas[0]?.lat
    ? { lat: paradas[0].lat, lng: paradas[0].lng }
    : CENTER_DEFAULT;

  return (
    <GoogleMap
      mapContainerClassName="w-full h-[260px] rounded-xl overflow-hidden"
      center={center}
      zoom={12}
      onLoad={(map) => { mapRef.current = map; }}
      options={{
        streetViewControl: false,
        mapTypeControl:    false,
        fullscreenControl: false,
      }}
    >
      {path.length > 0 && (
        <Polyline
          path={path}
          options={{
            strokeColor:   "#1d4ed8",
            strokeOpacity: 0.8,
            strokeWeight:  4,
          }}
        />
      )}

      {paradas.map((parada) => (
        <Marker
          key={String(parada.envioId) + parada.orden}
          position={{ lat: parada.lat, lng: parada.lng }}
          label={{
            text:       String(parada.orden),
            color:      "white",
            fontWeight: "bold",
            fontSize:   "12px",
          }}
          icon={{
            path:         window.google.maps.SymbolPath.CIRCLE,
            scale:        14,
            fillColor:    colorPorTipo(parada.tipo),
            fillOpacity:  1,
            strokeColor:  "white",
            strokeWeight: 2,
          }}
          onClick={() => setSelected(parada)}
        />
      ))}

      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div className="text-sm">
            <p className="font-bold capitalize">
              {selected.tipo?.toLowerCase() || "parada"} #{selected.nro_envio}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Parada {selected.orden}
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}