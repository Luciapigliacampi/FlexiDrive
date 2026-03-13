// microservicios/envio-service/src/controllers/dashboardControllers.js
import Envio from '../models/envioModels.js';
import axios from 'axios';
import { getDayRange, getNow } from '../utils/testDate.js';

const AUTH_BASE     = process.env.AUTH_SERVICE_URL     || 'http://localhost:3000';
const VIAJES_BASE   = process.env.VIAJES_SERVICE_URL   || 'http://localhost:3004';
const IA_ROUTE_BASE = process.env.IA_ROUTE_SERVICE_URL || 'http://localhost:3002';

function franjaIniciada(franja, horaActual) {
  if (!franja) return true;
  if (franja === '08:00-13:00' || franja === '00:00-12:00') return true;
  return horaActual >= 13;
}

function franjaEsMañana(franja) {
  if (!franja) return true;
  return franja === '00:00-12:00' || franja === '08:00-13:00';
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

  if (tipo === 'RETORNO') return 4;

  const norm = v => (v == null ? null : String(v));

  const origenId       = norm(tripPlan.origen?.localidadId);
  const destinoId      = norm(tripPlan.destino?.localidadId);
  const intermediasIds = (tripPlan.intermedias || []).map(i => norm(i.localidadId));

  // RETIRO usa ciudad origen del envío; ENTREGA usa ciudad destino
  const localidadId = norm(
    tipo === 'RETIRO' || tipo === 'RETORNO'
      ? envio.origenCiudad?.localidadId
      : envio.destinoCiudad?.localidadId
  );

  const esOrigen     = localidadId != null && localidadId === origenId;
  const esDestino    = localidadId != null && localidadId === destinoId;
  const esIntermedia = localidadId != null && intermediasIds.includes(localidadId);
  const esManana     = franjaEsMañana(envio.franja_horaria_retiro);

  // Grupo por localidad — retiro y entrega en la misma ciudad van juntos
  if (esOrigen     && esManana)  return 0;
  if (esIntermedia && esManana)  return 1;
  if (esDestino)                 return 2;
  if (esOrigen     && !esManana) return 3;

  return 7;
}

function getDireccionKey(envio, tipo) {
  const dir = tipo === 'RETIRO' ? envio.direccion_origen : envio.direccion_destino;
  if (dir?.lat != null && dir?.lng != null) {
    return `${parseFloat(dir.lat).toFixed(4)},${parseFloat(dir.lng).toFixed(4)}`;
  }
  return (dir?.texto || '').trim().toLowerCase();
}

/* ─── GET /dashboard/resumen ────────────────────────────────────────────── */
export const getDashboardResumen = async (req, res, next) => {
  try {
    const comisionistaId = req.userId;
    const { date } = req.query;
    const { inicioDia, finDia } = getDayRange(date);

    await lazyUpdateFranjaTarde(comisionistaId, inicioDia, finDia);

    const ESTADOS_ACTIVOS = ['EN_RETIRO', 'EN_CAMINO', 'DEMORADO_RETIRO', 'DEMORADO_ENTREGA'];

    const [enviosHoy, enRuta, pendientesRetiro] = await Promise.all([
      Envio.countDocuments({
        comisionistaId,
        $or: [
          { estadoId: 'ASIGNADO',  fecha_retiro:  { $gte: inicioDia, $lte: finDia } },
          { estadoId: 'RETIRADO',  fecha_entrega: { $gte: inicioDia, $lte: finDia } },
          { estadoId: { $in: ESTADOS_ACTIVOS } },
        ],
      }),
      Envio.countDocuments({
        comisionistaId,
        $or: [
          { estadoId: { $in: ESTADOS_ACTIVOS } },
          { estadoId: 'RETIRADO', fecha_entrega: { $gte: inicioDia, $lte: finDia } },
        ],
      }),
      Envio.countDocuments({
        comisionistaId,
        estadoId: { $in: ['ASIGNADO', 'EN_RETIRO', 'DEMORADO_RETIRO'] },
      }),
    ]);

    return res.status(200).json({ enviosHoy, enRuta, pendientesRetiro, calificacion: null });
  } catch (err) {
    next(err);
  }
};

/* ─── GET /dashboard/agenda ─────────────────────────────────────────────── */
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
        // Envíos del día: asignados con fecha_retiro hoy
        { estadoId: 'ASIGNADO',  fecha_retiro:  { $gte: inicioDia, $lte: finDia } },
        // Envíos del día: retirados con fecha_entrega hoy
        { estadoId: 'RETIRADO',  fecha_entrega: { $gte: inicioDia, $lte: finDia } },
        // Envíos activos sin restricción de fecha (en tránsito)
        { estadoId: { $in: ['EN_RETIRO', 'EN_CAMINO', 'CANCELADO_RETORNO'] } },
        // DEMORADO_RETIRO / DEMORADO_ENTREGA: sin restricción de fecha,
        // aparecen en la agenda hasta que se completen (pueden ser de días anteriores)
        { estadoId: { $in: ['DEMORADO_RETIRO', 'DEMORADO_ENTREGA'] } },
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
      if (['ASIGNADO', 'EN_RETIRO', 'DEMORADO_RETIRO'].includes(e.estadoId)) return 'RETIRO';
      if (e.estadoId === 'CANCELADO_RETORNO') return 'RETORNO';
      return 'ENTREGA'; // EN_CAMINO, RETIRADO, DEMORADO_ENTREGA
    }

    const itemsConMeta = envios.map(e => {
      const tipo  = getTipo(e);
      const grupo = getGrupoOrden(e, tipo, tripPlan);

      const franjaOrden =
        (e.franja_horaria_retiro === '00:00-12:00' || e.franja_horaria_retiro === '08:00-13:00') ? 0
        : e.franja_horaria_retiro === '12:00-23:59' ? 1
        : e.franja_horaria_retiro === '13:00-17:00' ? 1
        : e.franja_horaria_retiro === '17:00-20:00' ? 2
        : 0;

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
        estadoPrevio:  e.estadoId_previo || null,
        franja:        e.franja_horaria_retiro || null,
        fecha_retiro:  e.fecha_retiro  || null,
        fecha_entrega: e.fecha_entrega || null,
      };
    });

    // Cluster: paradas en la misma dirección física van juntas
    const clusterIndexMap = new Map();
    let clusterCounter = 0;

    const preOrden = [...itemsConMeta].sort((a, b) => {
      if (a._grupo  !== b._grupo)  return a._grupo  - b._grupo;
      if (a._franja !== b._franja) return a._franja - b._franja;
      return new Date(a._createdAt) - new Date(b._createdAt);
    });

    for (const item of preOrden) {
      const clusterKey = `${item._dirKey}||${item._franja}`;
      if (!clusterIndexMap.has(clusterKey)) {
        clusterIndexMap.set(clusterKey, clusterCounter++);
      }
      item._clusterKey = clusterKey;
    }

    itemsConMeta.sort((a, b) => {
      const ca = clusterIndexMap.get(a._clusterKey ?? `${a._dirKey}||${a._franja}`) ?? 999;
      const cb = clusterIndexMap.get(b._clusterKey ?? `${b._dirKey}||${b._franja}`) ?? 999;
      if (ca !== cb)               return ca - cb;
      if (a._grupo  !== b._grupo)  return a._grupo  - b._grupo;
      if (a._franja !== b._franja) return a._franja - b._franja;
      return new Date(a._createdAt) - new Date(b._createdAt);
    });

    const items = itemsConMeta.map(({ _grupo, _franja, _dirKey, _createdAt, _clusterKey, ...item }, i) => ({
      ...item,
      orden: i + 1,
    }));

    return res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
};

export { iniciarViaje } from './envioControllers.js';

/* ─── POST /dashboard/finalizar-viaje ───────────────────────────────────── */
// Llamado tanto por el botón manual como automáticamente cuando se
// completan todas las paradas desde routeControllers.
export const finalizarViaje = async (req, res, next) => {
  try {
    const comisionistaId = req.userId;
    const token = req.headers.authorization;
    // Acepta fecha desde query (?date=) o body ({ fecha })
    const fechaParam = req.query.date || req.body?.fecha;
    const { inicioDia, finDia } = getDayRange(fechaParam);

    // 1. Marcar envíos pendientes con estados diferenciados según qué falta hacer:
    //    - Falta retirar  → DEMORADO_RETIRO   (buildParadas lo incluye como parada RETIRO)
    //    - Falta entregar → DEMORADO_ENTREGA  (buildParadas lo incluye como parada ENTREGA)
    //    Guardamos estadoId_previo para referencia histórica
    // Guardar estadoId_previo y cambiar estado en dos pasos separados
    // (los pipelines de aggregation requieren configuración especial en algunas versiones de Mongoose)
    const [resRetiro, resCamino] = await Promise.all([
      // Pendientes de retiro → DEMORADO_RETIRO
      Envio.updateMany(
        { comisionistaId, estadoId: { $in: ['EN_RETIRO', 'ASIGNADO'] } },
        { $set: { estadoId: 'DEMORADO_RETIRO', estadoId_previo: 'EN_RETIRO' } }
      ),
      // Pendientes de entrega → DEMORADO_ENTREGA
      Envio.updateMany(
        { comisionistaId, estadoId: { $in: ['EN_CAMINO', 'RETIRADO'] } },
        { $set: { estadoId: 'DEMORADO_ENTREGA', estadoId_previo: 'EN_CAMINO' } }
      ),
    ]);

    // 2. Desactivar la ruta
    await axios.patch(
      `${IA_ROUTE_BASE}/api/rutas/desactivar/${comisionistaId}`,
      {},
      { headers: { Authorization: token } }
    ).catch(e => console.warn('⚠️ No se pudo desactivar ruta:', e.message));

    return res.status(200).json({
      message: 'Viaje finalizado.',
      demoradosRetiro:   resRetiro.modifiedCount,
      demoradosEntrega:  resCamino.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};
