// microservicios/envio-service/src/controllers/dashboardControllers.js
import Envio from '../models/envioModels.js';
import axios from 'axios';
import { getDayRange, getNow } from '../utils/testDate.js';

const AUTH_BASE     = process.env.AUTH_SERVICE_URL     || 'http://localhost:3000';
const VIAJES_BASE   = process.env.VIAJES_SERVICE_URL   || 'http://localhost:3004';
const IA_ROUTE_BASE = process.env.IA_ROUTE_SERVICE_URL || 'http://localhost:3002';

function franjaIniciada(franja, horaActual) {
  if (!franja) return true;
  // Franja mañana: siempre iniciada (cubre desde inicio del día)
  if (franja === '08:00-13:00' || franja === '00:00-12:00') return true;
  // Todas las franjas de tarde/noche inician a las 13hs —
  // el comisionista puede retirar a partir de las 13 independientemente
  // de si la franja es 13-17 o 17-20.
  return horaActual >= 13;
}

function franjaEsMañana(franja) {
  if (!franja) return true;
  return franja === '00:00-12:00' || franja === '08:00-13:00'; // legacy
}

async function lazyUpdateFranjaTarde(comisionistaId, inicioDia, finDia) {
  const horaActual = getNow().getHours();
  const asignadosHoy = await Envio.find({
    comisionistaId,
    estadoId: 'ASIGNADO',
    fecha_retiro: { $gte: inicioDia, $lte: finDia },
    franja_horaria_retiro: { $in: ['12:00-23:59', '13:00-17:00', '17:00-20:00'] },
  });
  const idsParaActivar = asignadosHoy
    .filter(e => franjaIniciada(e.franja_horaria_retiro, horaActual))
    .map(e => e._id);
  if (idsParaActivar.length > 0) {
    await Envio.updateMany({ _id: { $in: idsParaActivar } }, { $set: { estadoId: 'EN_RETIRO' } });
  }
  return idsParaActivar.length;
}

async function getTripPlanActivo(comisionistaId, token) {
  try {
    const { data } = await axios.get(`${VIAJES_BASE}/api/trip/mine`, {
      headers: { Authorization: token },
    });
    const trips = data?.tripPlans ?? [];
    return trips.find(t => t.activo) || null;
  } catch {
    return null;
  }
}

function getGrupoOrden(envio, tipo, tripPlan) {
  if (!tripPlan) return 7;

  const origenLocalidadId  = tripPlan.origen?.localidadId;
  const destinoLocalidadId = tripPlan.destino?.localidadId;
  const intermediasIds     = (tripPlan.intermedias || []).map(i => i.localidadId);

  const localidadId = tipo === 'RETIRO'
    ? envio.origenCiudad?.localidadId
    : envio.destinoCiudad?.localidadId;

  const esOrigen     = localidadId === origenLocalidadId;
  const esDestino    = localidadId === destinoLocalidadId;
  const esIntermedia = intermediasIds.includes(localidadId);
  const esManana     = franjaEsMañana(envio.franja_horaria_retiro);

  if (tipo === 'RETIRO') {
    if (esOrigen && esManana)     return 0;
    if (esIntermedia && esManana) return 1;
    if (esDestino)                return 3;
    if (esOrigen && !esManana)    return 5;
  }
  if (tipo === 'ENTREGA') {
    if (esIntermedia) return 2;
    if (esDestino)    return 4;
    if (esOrigen)     return 6;
  }
  if (tipo === 'RETORNO') return 6;

  return 7;
}

/**
 * Clave de dirección para agrupar envíos en la misma ubicación física.
 * Usa lat/lng redondeados a 4 decimales (~11m de precisión).
 * Si no hay coords, usa el texto de la dirección.
 */
function getDireccionKey(envio, tipo) {
  const dir = tipo === 'RETIRO' ? envio.direccion_origen : envio.direccion_destino;
  if (dir?.lat != null && dir?.lng != null) {
    return `${parseFloat(dir.lat).toFixed(4)},${parseFloat(dir.lng).toFixed(4)}`;
  }
  return (dir?.texto || '').trim().toLowerCase();
}

export const getDashboardResumen = async (req, res, next) => {
  try {
    const comisionistaId = req.userId;
    const { date } = req.query;
    const { inicioDia, finDia } = getDayRange(date);

    await lazyUpdateFranjaTarde(comisionistaId, inicioDia, finDia);

    const [enviosHoy, enRuta, pendientesRetiro] = await Promise.all([
      Envio.countDocuments({
        comisionistaId,
        $or: [
          { estadoId: 'ASIGNADO', fecha_retiro: { $gte: inicioDia, $lte: finDia } },
          { estadoId: 'RETIRADO',  fecha_entrega: { $gte: inicioDia, $lte: finDia } },
          { estadoId: { $in: ['EN_RETIRO', 'EN_CAMINO', 'DEMORADO'] } },
        ],
      }),
      Envio.countDocuments({
        comisionistaId,
        $or: [
          { estadoId: { $in: ['EN_RETIRO', 'EN_CAMINO', 'DEMORADO'] } },
          { estadoId: 'RETIRADO', fecha_entrega: { $gte: inicioDia, $lte: finDia } },
        ],
      }),
      Envio.countDocuments({
        comisionistaId,
        estadoId: { $in: ['ASIGNADO', 'EN_RETIRO'] },
      }),
    ]);

    return res.status(200).json({ enviosHoy, enRuta, pendientesRetiro, calificacion: null });
  } catch (err) {
    next(err);
  }
};

export const getAgendaHoy = async (req, res, next) => {
  try {
    const comisionistaId = req.userId;
    const dateStr = req.query.date;
    const { inicioDia, finDia } = getDayRange(dateStr);
    const token = req.headers.authorization;

    await lazyUpdateFranjaTarde(comisionistaId, inicioDia, finDia);

    const envios = await Envio.find({
      comisionistaId,
      $or: [
        { estadoId: 'ASIGNADO',  fecha_retiro: { $gte: inicioDia, $lte: finDia } },
      { estadoId: 'RETIRADO',  fecha_entrega: { $gte: inicioDia, $lte: finDia } },
        { estadoId: { $in: ['EN_RETIRO', 'EN_CAMINO', 'DEMORADO', 'CANCELADO_RETORNO'] } },
      ],
      eliminado: { $ne: true },
    });

    if (!envios.length) return res.status(200).json({ items: [] });

    const usuarioIds = [...new Set(envios.filter(e => e.usuarioId).map(e => String(e.usuarioId)))];

    const [tripPlan, ...nombresArr] = await Promise.all([
      getTripPlanActivo(comisionistaId, token),
      ...usuarioIds.map(async (uid) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/${uid}`, {
            headers: { Authorization: token },
          });
          return [uid, `${data.nombre} ${data.apellido}`.trim()];
        } catch {
          return [uid, null];
        }
      }),
    ]);

    const nombresMap = Object.fromEntries(nombresArr);

    function getTipo(e) {
      if (['ASIGNADO', 'EN_RETIRO'].includes(e.estadoId)) return 'RETIRO';
      if (e.estadoId === 'CANCELADO_RETORNO') return 'RETORNO';
      return 'ENTREGA';
    }

    // ── Construir items con metadatos ────────────────────────────────────────
    const itemsConMeta = envios.map(e => {
      const tipo  = getTipo(e);
      const grupo = getGrupoOrden(e, tipo, tripPlan);

      const franjaOrden = (e.franja_horaria_retiro === '00:00-12:00' || e.franja_horaria_retiro === '08:00-13:00') ? 0
        : e.franja_horaria_retiro === '12:00-23:59' ? 1
        : e.franja_horaria_retiro === '13:00-17:00' ? 1
        : e.franja_horaria_retiro === '17:00-20:00' ? 2
        : 0;

      // dirKey usa la dirección física relevante según tipo
      const dirKey = getDireccionKey(e, tipo);

      return {
        _grupo:     grupo,
        _franja:    franjaOrden,
        _dirKey:    dirKey,
        _createdAt: e.createdAt,
        id:       String(e._id),
        numero:   e.nro_envio,
        cliente:  nombresMap[String(e.usuarioId)] || '—',
        tipo,
        destino: tipo === 'RETIRO'
          ? (e.direccion_origen?.texto  || e.origenCiudad?.localidadNombre  || '—')
          : (e.direccion_destino?.texto || e.destinoCiudad?.localidadNombre || '—'),
        localidad: tipo === 'RETIRO'
          ? (e.origenCiudad?.localidadNombre  || '—')
          : (e.destinoCiudad?.localidadNombre || '—'),
        estado:        e.estadoId,
        franja:        e.franja_horaria_retiro || null,
        fecha_retiro:  e.fecha_retiro  || null,
        fecha_entrega: e.fecha_entrega || null,
      };
    });

    // ── Cluster cross-grupo: paradas en la misma dirección física quedan
    //    juntas aunque sean de tipos distintos (RETIRO + ENTREGA).
    //
    //    Algoritmo:
    //    1. Pre-ordenar por grupo → franja → createdAt (orden natural)
    //    2. Asignar índice de cluster a cada dirección la primera vez
    //       que aparece en ese pre-orden (sin incluir el tipo en la clave,
    //       para que RETIRO y ENTREGA compartan cluster)
    //    3. Orden final: clusterIndex → grupo → franja → createdAt
    const clusterIndexMap = new Map();
    let clusterCounter = 0;

    const preOrden = [...itemsConMeta].sort((a, b) => {
      if (a._grupo  !== b._grupo)  return a._grupo  - b._grupo;
      if (a._franja !== b._franja) return a._franja - b._franja;
      return new Date(a._createdAt) - new Date(b._createdAt);
    });

    for (const item of preOrden) {
      // Clave: dirección + franja — agrupa RETIRO+ENTREGA en misma dirección/franja,
      // pero separa la misma dirección si tiene franjas distintas (ej: retiro mañana
      // y retiro tarde en el mismo lugar son paradas de días distintos del viaje).
      const clusterKey = `${item._dirKey}||${item._franja}`;
      if (!clusterIndexMap.has(clusterKey)) {
        clusterIndexMap.set(clusterKey, clusterCounter++);
      }
      item._clusterKey = clusterKey;
    }

    itemsConMeta.sort((a, b) => {
      const ca = clusterIndexMap.get(a._clusterKey ?? `${a._dirKey}||${a._franja}`) ?? 999;
      const cb = clusterIndexMap.get(b._clusterKey ?? `${b._dirKey}||${b._franja}`) ?? 999;
      if (ca !== cb) return ca - cb;
      if (a._grupo  !== b._grupo)  return a._grupo  - b._grupo;
      if (a._franja !== b._franja) return a._franja - b._franja;
      return new Date(a._createdAt) - new Date(b._createdAt);
    });

    const items = itemsConMeta.map(({ _grupo, _franja, _dirKey, _createdAt, ...item }, i) => ({
      ...item,
      orden: i + 1,
    }));

    return res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
};

export { iniciarViaje } from './envioControllers.js';

export const finalizarViaje = async (req, res, next) => {
  try {
    const comisionistaId = req.userId;
    const token = req.headers.authorization;

    await axios.patch(
      `${IA_ROUTE_BASE}/api/rutas/desactivar/${comisionistaId}`,
      {},
      { headers: { Authorization: token } }
    ).catch(e => console.warn('⚠️ No se pudo desactivar ruta:', e.message));

    return res.status(200).json({ message: 'Viaje finalizado.' });
  } catch (err) {
    next(err);
  }
};
