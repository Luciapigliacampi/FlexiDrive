// microservicios/ia-route-service/src/controllers/routeControllers.js
import axios from 'axios';
import RutaOptima from '../models/rutaOptimaModel.js';
import { getDateString, getDate, getNow } from '../utils/testDate.js';

const ENVIO_BASE = process.env.ENVIO_SERVICE_URL || 'http://localhost:3001';
const AUTH_BASE = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
const VIAJES_BASE = process.env.VIAJES_BASE_URL || 'http://localhost:3004';

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

function mismaFecha(dateA, dateB) {
  if (!dateA || !dateB) return false;
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
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

      // case 'ASIGNADO':
      //   // Solo incluir en ruta si el viaje ya está iniciado
      //   if (!viajeIniciado) break;
      //   // fallthrough intencional
      case 'EN_RETIRO':
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

  const origenId = tripPlan.origen?.localidadId;
  const destinoId = tripPlan.destino?.localidadId;
  const intermediasIds = (tripPlan.intermedias || []).map(i => i.localidadId);

  const localidadId = parada.tipo === 'RETIRO' || parada.tipo === 'RETORNO'
    ? envio.origenCiudad?.localidadId
    : envio.destinoCiudad?.localidadId;

  const esOrigen = localidadId === origenId;
  const esDestino = localidadId === destinoId;
  const esIntermedia = intermediasIds.includes(localidadId);
  const esManana = !parada.franja_horaria || parada.franja_horaria === '00:00-12:00' || parada.franja_horaria === '08:00-13:00';

  if (parada.tipo === 'RETORNO') return 6;

  if (parada.tipo === 'RETIRO') {
    if (esOrigen && esManana) return 0;
    if (esIntermedia && esManana) return 1;
    if (esDestino) return 3;
    if (esOrigen && !esManana) return 5;
  }

  if (parada.tipo === 'ENTREGA') {
    if (esIntermedia) return 2;
    if (esDestino) return 4;
    if (esOrigen) return 6;
  }

  return 7;
}

/* ─── 1. GET /activa/:comisionistaId ─────────────────────────────────────── */
export const getRutaActiva = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    if (comisionistaId !== req.userId && req.userRol !== 'admin') {
      return res.status(403).json({ message: 'No tenés permiso para ver esta ruta.' });
    }

    const hoy = getNow();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

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
    const token = req.headers.authorization;
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

    const fechaDate = getDate(fecha);
    const rutaExistentePrev = await RutaOptima.findOne({ comisionistaId, activo: true });
    const viajeYaIniciado = rutaExistentePrev?.viaje_iniciado === true;

    const todasLasParadas = buildParadas(envios, viajeYaIniciado);

    if (todasLasParadas.length === 0) {
      return res.status(200).json({ message: 'No hay paradas para optimizar.' });
    }

    const tripPlan = await getTripPlan(comisionistaId, token);

    const envioMap = {};
    for (const e of envios) envioMap[String(e._id || e.id)] = e;

    const puntoInicio = (latActual && lngActual)
      ? `${parseFloat(latActual).toFixed(6)},${parseFloat(lngActual).toFixed(6)}`
      : `${todasLasParadas[0].lat},${todasLasParadas[0].lng}`;

    const waypointsSlice = todasLasParadas.slice(0, 23);
    const waypointsStr = waypointsSlice.map(p => `${p.lat},${p.lng}`).join('|');

    let ordenGoogle = null;
    let polyline = '';
    let distKm = 0;
    let tiempoMin = 0;

    if (apiKey && apiKey !== 'TU_API_KEY_AQUI') {
      try {
        const googleRes = await axios.get(
          'https://maps.googleapis.com/maps/api/directions/json',
          {
            params: {
              origin: puntoInicio,
              destination: puntoInicio,
              waypoints: `optimize:true|${waypointsStr}`,
              key: apiKey,
              mode: 'driving',
              language: 'es',
            },
          }
        );

        if (googleRes.data.status === 'OK') {
          const route = googleRes.data.routes[0];
          ordenGoogle = route.waypoint_order;
          polyline = route.overview_polyline.points;
          distKm = route.legs.reduce((a, l) => a + l.distance.value, 0) / 1000;
          tiempoMin = route.legs.reduce((a, l) => a + l.duration.value, 0) / 60;
        }
      } catch (gErr) {
        console.warn('⚠️ Google Maps falló, usando orden por grupos:', gErr.message);
      }
    }

    const posicionGoogle = {};
    if (ordenGoogle) {
      ordenGoogle.forEach((idxOriginal, posicion) => {
        const p = waypointsSlice[idxOriginal];
        posicionGoogle[`${p.envioId}_${p.tipo}`] = posicion;
      });
    }

    const paradasConMeta = waypointsSlice.map(p => {
      const envio = envioMap[p.envioId];
      const grupo = getGrupoOrden(p, envio || {}, tripPlan);
      const posG = posicionGoogle[`${p.envioId}_${p.tipo}`] ?? 999;
      const posF = franjaToMinutos(p.franja_horaria);
      const dirKey = (p.lat != null && p.lng != null)
        ? `${parseFloat(p.lat).toFixed(4)},${parseFloat(p.lng).toFixed(4)}`
        : (p.texto || '').trim().toLowerCase();

      return { ...p, _grupo: grupo, _posGoogle: posG, _posFragja: posF, _dirKey: dirKey };
    });

    // Cluster cross-grupo: paradas en la misma direccion fisica van juntas
    // aunque sean RETIRO y ENTREGA (grupos distintos).
    const clusterIndexMap = new Map();
    let clusterCounter = 0;
    const preOrdenRuta = [...paradasConMeta].sort((a, b) => {
      if (a._grupo !== b._grupo) return a._grupo - b._grupo;
      if (ordenGoogle) return a._posGoogle - b._posGoogle;
      return a._posFragja - b._posFragja;
    });
    for (const p of preOrdenRuta) {
      const clusterKey = `${p._dirKey}||${p._posFragja}`;
      if (!clusterIndexMap.has(clusterKey)) {
        clusterIndexMap.set(clusterKey, clusterCounter++);
      }
      p._clusterKey = clusterKey;
    }

    paradasConMeta.sort((a, b) => {
      const ca = clusterIndexMap.get(a._clusterKey ?? `${a._dirKey}||${a._posFragja}`) ?? 999;
      const cb = clusterIndexMap.get(b._clusterKey ?? `${b._dirKey}||${b._posFragja}`) ?? 999;
      if (ca !== cb) return ca - cb;
      if (a._grupo !== b._grupo) return a._grupo - b._grupo;
      if (ordenGoogle) return a._posGoogle - b._posGoogle;
      return a._posFragja - b._posFragja;
    });

    const rutaExistente = rutaExistentePrev;
    const completadas = rutaExistente
      ? rutaExistente.orden_entregas.filter(p => p.completada)
      : [];

    const ordenFinal = [
      ...completadas,
      ...paradasConMeta.map(({ _grupo, _posGoogle, _posFragja, _dirKey, _clusterKey, ...p }, i) => ({
        ...p,
        orden: completadas.length + i + 1,
      })),
    ];

    await RutaOptima.updateMany({ comisionistaId, activo: true }, { activo: false });

    const nuevaRuta = new RutaOptima({
      comisionistaId,
      fecha_viaje: fechaDate,
      fecha_generada: getNow(),
      orden_entregas: ordenFinal,
      polyline,
      distancia_total_km: distKm,
      tiempo_estimado_min: tiempoMin,
      activo: true,
      viaje_iniciado: viajeYaIniciado,  // ✅ preservar estado
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
    const { envioId } = req.params;
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
    let { comisionistaId, tipo, latActual, lngActual, fecha } = req.body;

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

    parada.completada = true;
    parada.completada_at = getNow();
    await ruta.save();

    const token = req.headers.authorization;
    const nuevoEstado = tipo === 'RETIRO'
      ? 'EN_CAMINO'
      : tipo === 'ENTREGA'
        ? 'ENTREGADO'
        : 'DEVUELTO';

    await axios.patch(
      `${ENVIO_BASE}/api/envios/${envioId}/actualizar-estado`,
      { envioId, nuevoEstado },
      { headers: { Authorization: token } }
    ).catch(e => console.warn('⚠️ No se pudo actualizar estado:', e.message));

    const pendientes = ruta.orden_entregas.filter(p => !p.completada);
    if (pendientes.length > 0) {
      const params = new URLSearchParams({
        fecha,
        latActual: latActual || '',
        lngActual: lngActual || '',
      });

      axios.get(
        `http://localhost:3002/api/rutas/generar/${comisionistaId}?${params}`,
        { headers: { Authorization: token } }
      ).catch(e => console.warn('⚠️ Re-optimización background falló:', e.message));
    }

    res.status(200).json({ message: 'Parada completada.', ruta });
  } catch (err) {
    res.status(500).json({ message: getApiErrorMessage(err) });
  }
};

/* ─── 5-7 ────────────────────────────────────────────────────────────────── */
export const getAddressSuggestions = async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) return res.status(400).json({ message: 'Falta el texto de búsqueda.' });

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      { params: { input, key: process.env.GOOGLE_MAPS_API_KEY, language: 'es', components: 'country:ar' } }
    );
    res.json(response.data.predictions);
  } catch (err) {
    res.status(500).json({ message: 'Error al conectar con Google Maps.' });
  }
};

export const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.query;
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      { params: { place_id: placeId, fields: 'geometry', key: process.env.GOOGLE_MAPS_API_KEY } }
    );
    const { lat, lng } = response.data.result.geometry.location;
    res.json({ lat, lng });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener coordenadas.' });
  }
};

export const getSeguimientoEnvio = async (req, res) => {
  try {
    const { envioId } = req.params;
    const token = req.headers.authorization;

    // Esta ruta es pública (sin authMiddleware), por eso no tiene JWT de usuario.
    // Usamos la ruta interna del envio-service protegida por INTERNAL_API_KEY.
    const { data: envio } = await axios.get(
      `${ENVIO_BASE}/api/envios/interno/${envioId}`,
      { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } }
    );

    let polyline = envio.polyline_especifica || '';
    if (!polyline) {
      const esRetorno = ['CANCELADO_RETORNO', 'DEVUELTO'].includes(envio.estadoId);
      const origen = esRetorno
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
          // Persistir la polyline para no recalcularla — usa ruta técnica (patchEnvioTecnico)
          await axios.patch(
            `${ENVIO_BASE}/api/envios/${envioId}`,
            { polyline_especifica: polyline },
            { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } }
          ).catch(() => {});
        }
      } catch {}
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
          telefono: u.telefono,
          foto: u.foto || null,
        };
      } catch {}
    }

    let calificado = false;
    try {
      const CAL_BASE = process.env.CALIFICACIONES_SERVICE_URL || 'http://localhost:3003';
      await axios.get(`${CAL_BASE}/api/calificaciones/envio/${envioId}`);
      calificado = true;
    } catch (e) {
      calificado = e?.response?.status !== 404;
    }

    res.json({
      nro_envio: envio.nro_envio,
      estado: envio.estadoId,
      es_demorado: envio.estadoId === 'DEMORADO',
      es_retorno: envio.estadoId === 'CANCELADO_RETORNO',
      fechas: {
        entrega_estimada: envio.fecha_entrega,
        franja_retiro: envio.franja_horaria_retiro || '—',
        retiro_confirmado: envio.fecha_retiro || null,
        actualizado: envio.updatedAt,
      },
      detalles: {
        origen: envio.direccion_origen.texto,
        destino: envio.direccion_destino.texto,
        notas: envio.notas_adicionales,
        paquetes: envio.paquetes.length,
      },
      comisionista: datosComisionista,
      mapa: {
        lat_origen: envio.direccion_origen.lat,
        lng_origen: envio.direccion_origen.lng,
        lat_destino: envio.direccion_destino.lat,
        lng_destino: envio.direccion_destino.lng,
        polyline,
      },
    });
  } catch (err) {
    res.status(500).json({ message: getApiErrorMessage(err, 'Error al obtener el seguimiento.') });
  }
};

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

export const marcarViajeIniciado = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    if (comisionistaId !== req.userId && req.userRol !== 'admin') {
      return res.status(403).json({ message: 'No tenés permiso.' });
    }

    const hoy = getNow();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

    const result = await RutaOptima.updateMany(
      { comisionistaId, activo: true, fecha_viaje: { $gte: inicioDia, $lte: finDia } },
      { viaje_iniciado: true }
    );

    res.status(200).json({ message: 'Viaje marcado como iniciado.', modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
