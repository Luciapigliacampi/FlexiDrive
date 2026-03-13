// microservicios/ia-route-service/src/controllers/routeControllers.js
import axios from 'axios';
import RutaOptima from '../models/rutaOptimaModel.js';
import { getDateString, getDate, getNow } from '../utils/testDate.js';

const ENVIO_BASE    = process.env.ENVIO_SERVICE_URL    || 'http://localhost:3001';
const AUTH_BASE     = process.env.AUTH_SERVICE_URL     || 'http://localhost:3000';
const VIAJES_BASE   = process.env.VIAJES_BASE_URL      || 'http://localhost:3004';
const IA_ROUTE_BASE = process.env.IA_ROUTE_SERVICE_URL || 'http://localhost:3002';

/* ─── helpers ────────────────────────────────────────────────────────────── */
function getApiErrorMessage(err, fallback = 'Error interno') {
  return err?.response?.data?.message || err?.message || fallback;
}

function franjaToMinutos(franja = '') {
  const [inicio] = (franja || '').split('-');
  if (!inicio) return 0;
  const [h, m] = inicio.split(':').map(Number);
  return h * 60 + (m || 0);
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── buildParadas ──────────────────────────────────────────────────────── */
function buildParadas(envios, viajeIniciado = false) {
  const paradas = [];

  for (const envio of envios) {
    const id = String(envio._id || envio.id);

    switch (envio.estadoId) {
      case 'CANCELADO_RETORNO':
        if (envio.direccion_origen?.lat != null) {
          paradas.push({
            envioId: id,
            nro_envio: envio.nro_envio,
            tipo: 'RETORNO',
            lat: envio.direccion_origen.lat,
            lng: envio.direccion_origen.lng,
            texto: envio.direccion_origen.texto,
            franja_horaria: null,
            completada: false,
          });
        }
        break;

      case 'ASIGNADO':
        if (!viajeIniciado) break;
      case 'EN_RETIRO':
      case 'DEMORADO_RETIRO':
        if (envio.direccion_origen?.lat != null) {
          paradas.push({
            envioId: id,
            nro_envio: envio.nro_envio,
            tipo: 'RETIRO',
            lat: envio.direccion_origen.lat,
            lng: envio.direccion_origen.lng,
            texto: envio.direccion_origen.texto,
            franja_horaria: envio.franja_horaria_retiro || null,
            completada: false,
          });
        } else {
          console.warn(`⚠️ Envío ${envio.nro_envio} (${envio.estadoId}) sin coords en direccion_origen`);
        }
        break;

      case 'RETIRADO':
      case 'EN_CAMINO':
      case 'DEMORADO':
        if (envio.direccion_destino?.lat != null) {
          paradas.push({
            envioId: id,
            nro_envio: envio.nro_envio,
            tipo: 'ENTREGA',
            lat: envio.direccion_destino.lat,
            lng: envio.direccion_destino.lng,
            texto: envio.direccion_destino.texto,
            franja_horaria: null,
            completada: false,
          });
        }
        break;

      default:
        break;
    }
  }

  return paradas;
}

/* ─── getTripPlan ───────────────────────────────────────────────────────── */
async function getTripPlan(comisionistaId, token) {
  try {
    const { data } = await axios.get(`${VIAJES_BASE}/api/trip/mine`, {
      headers: { Authorization: token },
    });
    const trips = Array.isArray(data?.tripPlans) ? data.tripPlans : [];
    return trips.find(t => t.activo) || null;
  } catch {
    return null;
  }
}

/* ─── getGrupoOrden ─────────────────────────────────────────────────────── */
function getGrupoOrden(parada, envio, tripPlan) {
  if (!tripPlan) return 7;
  if (parada.tipo === 'RETORNO') return 4;

  const norm = v => (v == null ? null : String(v));

  const origenId       = norm(tripPlan.origen?.localidadId);
  const destinoId      = norm(tripPlan.destino?.localidadId);
  const intermediasIds = (tripPlan.intermedias || []).map(i => norm(i.localidadId));

  const localidadId = norm(
    parada.tipo === 'RETIRO' || parada.tipo === 'RETORNO'
      ? envio.origenCiudad?.localidadId
      : envio.destinoCiudad?.localidadId
  );

  const esOrigen     = localidadId != null && localidadId === origenId;
  const esDestino    = localidadId != null && localidadId === destinoId;
  const esIntermedia = localidadId != null && intermediasIds.includes(localidadId);

  const esManana = !parada.franja_horaria ||
    parada.franja_horaria === '00:00-12:00' ||
    parada.franja_horaria === '08:00-13:00';

  if (esOrigen     && esManana)  return 0;
  if (esIntermedia && esManana)  return 1;
  if (esDestino)                 return 2;
  if (esOrigen     && !esManana) return 3;

  return 7;
}

/* ─── helper: rango de hoy ──────────────────────────────────────────────── */
function getRangoHoy() {
  const hoy  = getNow();
  const yyyy = String(hoy.getFullYear());
  const mm   = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd   = String(hoy.getDate()).padStart(2, '0');
  return {
    inicioDia: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
    finDia:    new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`),
  };
}

/* ─── 1. GET /activa/:comisionistaId ─────────────────────────────────────── */
export const getRutaActiva = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    if (comisionistaId !== req.userId && req.userRol !== 'admin') {
      return res.status(403).json({ message: 'No tenés permiso para ver esta ruta.' });
    }

    const { inicioDia, finDia } = getRangoHoy();

    const ruta = await RutaOptima.findOne({
      comisionistaId,
      activo: true,
      fecha_viaje: { $gte: inicioDia, $lte: finDia },
    }).sort({ createdAt: -1 });

    if (!ruta) return res.status(404).json({ message: 'No hay ruta activa para hoy.' });
    res.status(200).json(ruta);
  } catch (err) {
    res.status(500).json({ message: getApiErrorMessage(err) });
  }
};

/* ─── 2. GET /generar/:comisionistaId ────────────────────────────────────── */
export const generarRutaParaComisionista = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    let { fecha, latActual, lngActual } = req.query;
    const token  = req.headers.authorization;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    fecha = getDateString(fecha);

    if (comisionistaId !== req.userId && req.userRol !== 'admin') {
      return res.status(403).json({ message: 'Solo podés generar tu propia ruta.' });
    }
    if (!fecha) return res.status(400).json({ message: 'Falta el parámetro fecha.' });

    let envios;
    try {
      const resp = await axios.get(
        `${ENVIO_BASE}/api/envios/comisionista/${comisionistaId}/ruta`,
        { params: { fecha }, headers: { Authorization: token } }
      );
      envios = resp.data;
    } catch (e) {
      if (e?.response?.status === 404) {
        return res.status(404).json({ message: 'No hay envíos para esta fecha.' });
      }
      throw e;
    }

    if (!envios || envios.length === 0) {
      return res.status(404).json({ message: 'No hay envíos para esta fecha.' });
    }

    const fechaDate         = getDate(fecha);
    const rutaExistentePrev = await RutaOptima.findOne({ comisionistaId, activo: true });
    const viajeYaIniciado   = rutaExistentePrev?.viaje_iniciado === true;

    const todasLasParadas = buildParadas(envios, viajeYaIniciado);

    if (todasLasParadas.length === 0) {
      return res.status(200).json({ message: 'No hay paradas para optimizar.' });
    }

    const tripPlan = await getTripPlan(comisionistaId, token);

    const envioMap = {};
    for (const e of envios) envioMap[String(e._id || e.id)] = e;

    const _latInicio = latActual || rutaExistentePrev?.lat_inicio;
    const _lngInicio = lngActual || rutaExistentePrev?.lng_inicio;
    const puntoInicio = (_latInicio && _lngInicio)
      ? `${parseFloat(_latInicio).toFixed(6)},${parseFloat(_lngInicio).toFixed(6)}`
      : `${todasLasParadas[0].lat},${todasLasParadas[0].lng}`;

    const todasPendientes = todasLasParadas.slice(0, 23);

    const paradasConMeta = todasPendientes.map(p => {
      const envio = envioMap[p.envioId];
      const grupo = getGrupoOrden(p, envio || {}, tripPlan);
      const posF  = franjaToMinutos(p.franja_horaria);
      const dirKey = (p.lat != null && p.lng != null)
        ? `${parseFloat(p.lat).toFixed(4)},${parseFloat(p.lng).toFixed(4)}`
        : (p.texto || '').trim().toLowerCase();
      return { ...p, _grupo: grupo, _posGoogle: 999, _posFragja: posF, _dirKey: dirKey };
    });

    if (tripPlan) {
      console.log('🗺️  TripPlan:', tripPlan.origen?.localidadNombre, '→',
        (tripPlan.intermedias || []).map(i => i.localidadNombre).join(' → '), '→',
        tripPlan.destino?.localidadNombre);
    } else {
      console.warn('⚠️  Sin tripPlan activo — todos los envíos quedarán en grupo 7');
    }
    for (const p of paradasConMeta) {
      console.log(`  [G${p._grupo}] ${p.tipo} ${p.nro_envio} - ${p.texto?.split(',')[0]}`);
    }

    const gruposMap = new Map();
    for (const p of paradasConMeta) {
      if (!gruposMap.has(p._grupo)) gruposMap.set(p._grupo, []);
      gruposMap.get(p._grupo).push(p);
    }
    const gruposOrdenados = [...gruposMap.entries()].sort(([a], [b]) => a - b);

    let polyline  = '';
    let distKm    = 0;
    let tiempoMin = 0;
    let posGlobal = 0;

    if (apiKey && apiKey !== 'TU_API_KEY_AQUI') {
      let puntoInicioGrupo = puntoInicio;

      for (const [grupoNum, paradasGrupo] of gruposOrdenados) {
        if (paradasGrupo.length === 0) continue;

        paradasGrupo.sort((a, b) => a._posFragja - b._posFragja);

        if (paradasGrupo.length === 1) {
          paradasGrupo[0]._posGoogle = posGlobal++;
          puntoInicioGrupo = `${paradasGrupo[0].lat},${paradasGrupo[0].lng}`;
          continue;
        }

        const ultimaDelGrupo   = paradasGrupo[paradasGrupo.length - 1];
        const intermedGrupo    = paradasGrupo.slice(0, -1);
        const destinoGrupo     = `${ultimaDelGrupo.lat},${ultimaDelGrupo.lng}`;
        const waypointsGrupo   = intermedGrupo.map(p => `${p.lat},${p.lng}`).join('|');

        try {
          const googleRes = await axios.get(
            'https://maps.googleapis.com/maps/api/directions/json',
            {
              params: {
                origin:      puntoInicioGrupo,
                destination: destinoGrupo,
                waypoints:   intermedGrupo.length > 0 ? `optimize:true|${waypointsGrupo}` : undefined,
                key:         apiKey,
                mode:        'driving',
                language:    'es',
              },
            }
          );

          if (googleRes.data.status === 'OK') {
            const route      = googleRes.data.routes[0];
            const wayOrder   = route.waypoint_order;
            distKm   += route.legs.reduce((a, l) => a + l.distance.value, 0) / 1000;
            tiempoMin += route.legs.reduce((a, l) => a + l.duration.value, 0) / 60;

            const ordenadosGoogle = [
              ...wayOrder.map(i => intermedGrupo[i]),
              ultimaDelGrupo,
            ];
            for (const p of ordenadosGoogle) {
              p._posGoogle = posGlobal++;
            }
            puntoInicioGrupo = destinoGrupo;
          } else {
            for (const p of paradasGrupo) p._posGoogle = posGlobal++;
            puntoInicioGrupo = `${ultimaDelGrupo.lat},${ultimaDelGrupo.lng}`;
          }
        } catch (gErr) {
          console.warn(`⚠️ Google Maps falló en grupo ${grupoNum}:`, gErr.message);
          for (const p of paradasGrupo) p._posGoogle = posGlobal++;
          puntoInicioGrupo = `${ultimaDelGrupo.lat},${ultimaDelGrupo.lng}`;
        }
      }
    }

    paradasConMeta.sort((a, b) => {
      if (a._grupo     !== b._grupo)     return a._grupo     - b._grupo;
      if (a._posGoogle !== b._posGoogle) return a._posGoogle - b._posGoogle;
      return a._posFragja - b._posFragja;
    });

    if (apiKey && apiKey !== 'TU_API_KEY_AQUI' && todasPendientes.length > 0) {
      const ultimaOrden      = paradasConMeta[paradasConMeta.length - 1];
      const intermediasOrden = paradasConMeta.slice(0, -1);

      try {
        const gRes = await axios.get(
          'https://maps.googleapis.com/maps/api/directions/json',
          {
            params: {
              origin:      puntoInicio,
              destination: `${ultimaOrden.lat},${ultimaOrden.lng}`,
              waypoints:   intermediasOrden.length > 0
                ? intermediasOrden.map(p => `${p.lat},${p.lng}`).join('|')
                : undefined,
              key:      apiKey,
              mode:     'driving',
              language: 'es',
            },
          }
        );
        if (gRes.data.status === 'OK') {
          polyline  = gRes.data.routes[0].overview_polyline.points;
          distKm    = gRes.data.routes[0].legs.reduce((a, l) => a + l.distance.value, 0) / 1000;
          tiempoMin = gRes.data.routes[0].legs.reduce((a, l) => a + l.duration.value, 0) / 60;
        }
      } catch (gErr) {
        console.warn('⚠️ Google Maps falló al generar polyline completo:', gErr.message);
      }
    }

    const completadasPrev = rutaExistentePrev
      ? rutaExistentePrev.orden_entregas.filter(p => p.completada)
      : [];

    const ordenFinal = [
      ...completadasPrev,
      ...paradasConMeta.map(({ _grupo, _posGoogle, _posFragja, _dirKey, _clusterKey, ...p }, i) => ({
        ...p,
        orden: completadasPrev.length + i + 1,
      })),
    ];

    await RutaOptima.updateMany({ comisionistaId, activo: true }, { activo: false });

    const nuevaRuta = new RutaOptima({
      comisionistaId,
      fecha_viaje:         fechaDate,
      fecha_generada:      getNow(),
      orden_entregas:      ordenFinal,
      polyline,
      distancia_total_km:  distKm,
      tiempo_estimado_min: tiempoMin,
      activo:              true,
      viaje_iniciado:      viajeYaIniciado,
      lat_inicio: _latInicio
        ? parseFloat(_latInicio)
        : (rutaExistentePrev?.lat_inicio ?? null),
      lng_inicio: _lngInicio
        ? parseFloat(_lngInicio)
        : (rutaExistentePrev?.lng_inicio ?? null),
    });

    await nuevaRuta.save();
    res.status(200).json(nuevaRuta);

  } catch (err) {
    console.error('Error en generarRuta:', err?.response?.data || err.message);
    res.status(500).json({ message: getApiErrorMessage(err, 'Error al generar la ruta.') });
  }
};

/* ─── 3. PATCH /parada/:envioId/confirmar-retiro ─────────────────────────── */
export const confirmarFechaRetiro = async (req, res) => {
  try {
    const { envioId }               = req.params;
    const { fecha, comisionistaId } = req.body;

    const fechaFinal = getDateString(fecha);
    if (!fechaFinal) return res.status(400).json({ message: 'Falta la fecha de retiro.' });

    const fechaDate = getDate(fechaFinal);

    const ruta = await RutaOptima.findOne({ comisionistaId, activo: true });
    if (ruta) {
      const parada = ruta.orden_entregas.find(
        p => String(p.envioId) === String(envioId) && p.tipo === 'RETIRO'
      );
      if (parada) {
        parada.fecha_retiro_confirmada = fechaDate;
        await ruta.save();
      }
    }

    const token = req.headers.authorization;
    await axios.patch(
      `${ENVIO_BASE}/api/envios/${envioId}`,
      { fecha_retiro: fechaDate },
      { headers: { Authorization: token } }
    ).catch(e => console.warn('⚠️ No se pudo persistir fecha_retiro:', e.message));

    res.status(200).json({ message: 'Fecha de retiro confirmada.', fecha: fechaDate });
  } catch (err) {
    res.status(500).json({ message: getApiErrorMessage(err) });
  }
};

/* ─── 4. PATCH /parada/:envioId/completar ───────────────────────────────── */
export const completarParada = async (req, res) => {
  try {
    const { envioId } = req.params;
    let { comisionistaId, tipo, fecha } = req.body;

    fecha = getDateString(fecha);

    const ruta = await RutaOptima.findOne({ comisionistaId, activo: true });
    if (!ruta) return res.status(404).json({ message: 'No hay ruta activa.' });

    const parada = ruta.orden_entregas.find(
      p => String(p.envioId) === String(envioId) && p.tipo === tipo
    );
    if (!parada) return res.status(404).json({ message: 'Parada no encontrada.' });

    if (tipo === 'ENTREGA') {
      const retiroDelMismoEnvio = ruta.orden_entregas.find(
        p => String(p.envioId) === String(envioId) && p.tipo === 'RETIRO'
      );
      if (retiroDelMismoEnvio && !retiroDelMismoEnvio.completada) {
        return res.status(400).json({
          message: 'Primero tenés que completar el retiro de este envío.',
        });
      }
    }

    parada.completada    = true;
    parada.completada_at = getNow();

    if (tipo === 'ENTREGA') {
      const retiroDelEnvio = ruta.orden_entregas.find(
        p => String(p.envioId) === String(envioId) && p.tipo === 'RETIRO' && p.completada
      );
      const origenLat = retiroDelEnvio?.lat ?? ruta.lat_inicio;
      const origenLng = retiroDelEnvio?.lng ?? ruta.lng_inicio;

      if (origenLat != null && origenLng != null) {
        parada.distancia_km = parseFloat(
          haversineKm(origenLat, origenLng, parada.lat, parada.lng).toFixed(2)
        );
      }
    } else {
      if (ruta.lat_inicio != null && ruta.lng_inicio != null) {
        parada.distancia_km = parseFloat(
          haversineKm(ruta.lat_inicio, ruta.lng_inicio, parada.lat, parada.lng).toFixed(2)
        );
      }
    }

    ruta.lat_inicio = parada.lat;
    ruta.lng_inicio = parada.lng;

    await ruta.save();

    const token = req.headers.authorization;

    if (tipo === 'RETIRO') {
      await axios.patch(
        `${ENVIO_BASE}/api/envios/${envioId}/marcar-retirado`,
        {},
        { headers: { Authorization: token } }
      ).catch(e => console.warn('⚠️ No se pudo marcar retirado:', e.message));
    } else if (tipo === 'ENTREGA') {
      await axios.patch(
        `${ENVIO_BASE}/api/envios/${envioId}/marcar-entregado`,
        { distanciaKm: parada.distancia_km ?? null },
        { headers: { Authorization: token } }
      ).catch(e => console.warn('⚠️ No se pudo marcar entregado:', e.message));
    }

    // ── Verificar si el viaje está realmente completo ─────────────────────
    // Una parada de RETIRO completada no significa viaje completo: el envío
    // ahora está EN_CAMINO y necesita su parada de ENTREGA. Solo finalizamos
    // cuando no queda ninguna parada pendiente Y no hay envíos en estado
    // EN_CAMINO o RETIRADO sin parada de entrega en la ruta actual.
    const pendientes = ruta.orden_entregas.filter(p => !p.completada);

    if (pendientes.length === 0) {
      // Verificar en el envio-service si quedó algún envío sin entregar.
      // Esto cubre el caso donde un retiro genera implícitamente una entrega
      // pendiente que aún no figura como parada en la ruta (se agregará en la
      // re-optimización), por lo que no debemos finalizar el viaje todavía.
      let hayEnviosPendientesDeEntrega = false;
      try {
        const { data: envioActual } = await axios.get(
          `${ENVIO_BASE}/api/envios/interno/${envioId}`,
          { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } }
        );
        // Si el envío recién "retirado" quedó en EN_CAMINO, aún falta entregarlo
        if (['EN_CAMINO', 'RETIRADO'].includes(envioActual?.estadoId)) {
          hayEnviosPendientesDeEntrega = true;
        }
      } catch (e) {
        console.warn('⚠️ No se pudo verificar estado del envío:', e.message);
        // En caso de error, ser conservador y no finalizar el viaje
        hayEnviosPendientesDeEntrega = true;
      }

      if (!hayEnviosPendientesDeEntrega) {
        // Viaje realmente completo: finalizar
        await RutaOptima.updateMany({ comisionistaId, activo: true }, { activo: false });

        await axios.post(
          `${ENVIO_BASE}/api/envios/comisionista/dashboard/finalizar-viaje`,
          { fecha },
          { headers: { Authorization: token } }
        ).catch(e => console.warn('⚠️ No se pudo finalizar viaje automáticamente:', e.message));

        return res.status(200).json({
          message: 'Parada completada. ¡Todas las paradas completadas! Viaje finalizado.',
          ruta: { ...ruta.toObject(), activo: false },
          viajeCompletado: true,
        });
      }
    }

    // Hay paradas pendientes (o envíos que aún necesitan entrega): re-optimizar
    const params = new URLSearchParams({
      fecha,
      latActual: parada.lat,
      lngActual: parada.lng,
    });

    try {
      const { data: rutaReoptimizada } = await axios.get(
        `${IA_ROUTE_BASE}/api/rutas/generar/${comisionistaId}?${params}`,
        { headers: { Authorization: token } }
      );
      return res.status(200).json({
        message: 'Parada completada.',
        ruta: rutaReoptimizada,
        viajeCompletado: false,
      });
    } catch (e) {
      console.warn('⚠️ Re-optimización falló:', e.message);
      return res.status(200).json({
        message: 'Parada completada.',
        ruta,
        viajeCompletado: false,
      });
    }

  } catch (err) {
    res.status(500).json({ message: getApiErrorMessage(err) });
  }
};

/* ─── 5. GET /sugerencias ────────────────────────────────────────────────── */
export const getAddressSuggestions = async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) return res.status(400).json({ message: 'Falta el texto de búsqueda.' });

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      {
        params: {
          input,
          key:        process.env.GOOGLE_MAPS_API_KEY,
          language:   'es',
          components: 'country:ar',
        },
      }
    );
    res.json(response.data.predictions);
  } catch (err) {
    res.status(500).json({ message: 'Error al conectar con Google Maps.' });
  }
};

/* ─── 6. GET /place-details ──────────────────────────────────────────────── */
export const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.query;
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields:   'geometry',
          key:      process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );
    const { lat, lng } = response.data.result.geometry.location;
    res.json({ lat, lng });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener coordenadas.' });
  }
};

/* ─── 7. GET /seguimiento/:envioId ───────────────────────────────────────── */
export const getSeguimientoEnvio = async (req, res) => {
  try {
    const { envioId } = req.params;
    const token       = req.headers.authorization;

    const { data: envio } = await axios.get(
      `${ENVIO_BASE}/api/envios/interno/${envioId}`,
      { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } }
    );

    let polyline = envio.polyline_especifica || '';
    if (!polyline) {
      const esRetorno = ['CANCELADO_RETORNO', 'DEVUELTO'].includes(envio.estadoId);
      const origen  = esRetorno
        ? `${envio.direccion_destino.lat},${envio.direccion_destino.lng}`
        : `${envio.direccion_origen.lat},${envio.direccion_origen.lng}`;
      const destino = esRetorno
        ? `${envio.direccion_origen.lat},${envio.direccion_origen.lng}`
        : `${envio.direccion_destino.lat},${envio.direccion_destino.lng}`;
      try {
        const gRes = await axios.get(
          'https://maps.googleapis.com/maps/api/directions/json',
          { params: { origin: origen, destination: destino, key: process.env.GOOGLE_MAPS_API_KEY } }
        );
        if (gRes.data.status === 'OK') {
          polyline = gRes.data.routes[0].overview_polyline.points;
          await axios.patch(
            `${ENVIO_BASE}/api/envios/${envioId}`,
            { polyline_especifica: polyline },
            { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } }
          ).catch(() => {});
        }
      } catch { /* */ }
    }

    let datosComisionista = null;
    if (envio.comisionistaId) {
      try {
        const { data: u } = await axios.get(
          `${AUTH_BASE}/api/auth/${envio.comisionistaId}`,
          { headers: { Authorization: token } }
        );
        datosComisionista = {
          nombreCompleto: `${u.nombre} ${u.apellido}`,
          telefono:       u.telefono,
          foto:           u.foto || null,
        };
      } catch { /* */ }
    }

    let calificado   = false;
    let calificacion = null;
    try {
      const CAL_BASE = process.env.CALIFICACIONES_SERVICE_URL || 'http://localhost:3003';
      const calRes   = await axios.get(`${CAL_BASE}/api/calificaciones/envio/${envioId}`);
      calificado     = true;
      calificacion   = {
        puntuacion: calRes.data.puntuacion,
        comentario: calRes.data.comentario ?? null,
      };
    } catch (e) {
      calificado = e?.response?.status !== 404;
    }

    res.json({
      nro_envio:           envio.nro_envio,
      createdAt:           envio.createdAt,
      estado:              envio.estadoId,
      es_demorado:         ['DEMORADO', 'DEMORADO_ENTREGA', 'DEMORADO_RETIRO'].includes(envio.estadoId),
      es_retorno:          envio.estadoId === 'CANCELADO_RETORNO',
      fechas: {
        entrega_estimada:  envio.fecha_entrega,
        franja_retiro:     envio.franja_horaria_retiro || '—',
        retiro_confirmado: envio.fecha_retiro || null,
        actualizado:       envio.updatedAt,
      },
      detalles: {
        origen:   envio.direccion_origen.texto,
        destino:  envio.direccion_destino.texto,
        notas:    envio.notas_adicionales,
        paquetes: envio.paquetes.length,
      },
      pago:                envio.pago ?? { confirmado: false, metodo: null, fecha: null },
      metodo_pago_cliente: envio.metodo_pago_cliente ?? null,
      comisionista: datosComisionista,
      mapa: {
        lat_origen:  envio.direccion_origen.lat,
        lng_origen:  envio.direccion_origen.lng,
        lat_destino: envio.direccion_destino.lat,
        lng_destino: envio.direccion_destino.lng,
        polyline,
      },
      calificado,
      calificacion,
    });
  } catch (err) {
    res.status(500).json({ message: getApiErrorMessage(err, 'Error al obtener el seguimiento.') });
  }
};

/* ─── 8. PATCH /desactivar/:comisionistaId ───────────────────────────────── */
export const desactivarRuta = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    if (comisionistaId !== req.userId && req.userRol !== 'admin') {
      return res.status(403).json({ message: 'No tenés permiso.' });
    }
    await RutaOptima.updateMany({ comisionistaId, activo: true }, { activo: false });
    res.status(200).json({ message: 'Ruta desactivada.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── 9. PATCH /iniciar/:comisionistaId ──────────────────────────────────── */
export const marcarViajeIniciado = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    if (comisionistaId !== req.userId && req.userRol !== 'admin') {
      return res.status(403).json({ message: 'No tenés permiso.' });
    }

    const { latInicio, lngInicio } = req.body;
    const { inicioDia, finDia }    = getRangoHoy();

    const updateData = { viaje_iniciado: true };
    if (latInicio != null && lngInicio != null) {
      updateData.lat_inicio = parseFloat(latInicio);
      updateData.lng_inicio = parseFloat(lngInicio);
    }

    const result = await RutaOptima.updateMany(
      { comisionistaId, activo: true, fecha_viaje: { $gte: inicioDia, $lte: finDia } },
      updateData
    );

    res.status(200).json({ message: 'Viaje marcado como iniciado.', modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
