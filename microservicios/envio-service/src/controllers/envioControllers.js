// microservicios/envio-service/src/controllers/envioControllers.js
import Envio from '../models/envioModels.js';
import EnvioXComisionista from '../models/envioXcomisionistaModel.js';
import axios from 'axios';
import { marcarDemoradosPorFecha } from '../utils/estadosAutomaticos.js';
import {
  getNow,
  getDayRange,
  sameDayLocal,
} from '../utils/testDate.js';
import {
  notifEnvioAceptado,
  notifEstadoActualizado,
  notifRetiroConfirmado,
  notifCanceladoPorComisionista,
  notifNuevoEnvioDisponible,
  notifCanceladoPorCliente,
} from '../utils/notificar.js';

function franjaIniciada(franja, horaActual) {
  if (!franja) return true;
  if (franja === '00:00-12:00' || franja === '08:00-13:00') return true;
  return horaActual >= 13;
}

export const createEnvio = async (req, res, next) => {
  try {
    const {
      direccion_origen, direccion_destino,
      origenCiudad, destinoCiudad,
      paquetes, fecha_entrega, franja_horaria_retiro,
      notas_adicionales, comisionistaId, tripPlanId, destinatarioId,
      metodo_pago_cliente,
    } = req.body;

    if (!paquetes || !Array.isArray(paquetes) || paquetes.length === 0)
      return res.status(400).json({ message: 'Debes incluir al menos un paquete en el envío.' });

    const validDir = (d) =>
      d && typeof d === 'object' && typeof d.texto === 'string' && d.texto.trim().length > 0;

    if (!validDir(direccion_origen))
      return res.status(400).json({ message: 'direccion_origen debe ser { texto, lat, lng } válido.' });
    if (!validDir(direccion_destino))
      return res.status(400).json({ message: 'direccion_destino debe ser { texto, lat, lng } válido.' });
    if (!origenCiudad?.localidadId || !origenCiudad?.localidadNombre)
      return res.status(400).json({ message: 'origenCiudad inválido.' });
    if (!destinoCiudad?.localidadId || !destinoCiudad?.localidadNombre)
      return res.status(400).json({ message: 'destinoCiudad inválido.' });
    if (!fecha_entrega)
      return res.status(400).json({ message: 'fecha_entrega es obligatoria.' });
    if (!franja_horaria_retiro?.trim())
      return res.status(400).json({ message: "franja_horaria_retiro es obligatoria (ej: '08:00-12:00')." });

    const TARIFA_POR_BULTO = 1200;
    const costoCalculado   = paquetes.length * TARIFA_POR_BULTO;

    const ahora   = getNow();
    const prefijo = `FD-${ahora.getFullYear().toString().slice(-2)}${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const nroEnvioUnico = `${prefijo}-${Math.floor(1000 + Math.random() * 9000)}`;

    const paquetesProcesados = paquetes.map((p, i) => ({
      ...p,
      clienteId:      req.userId,
      codigo_paquete: `B-${nroEnvioUnico}-${i + 1}`,
    }));

    const nuevoEnvio = new Envio({
      usuarioId:    req.userId,
      destinatarioId: destinatarioId || null,
      nro_envio:    nroEnvioUnico,
      direccion_origen, direccion_destino,
      origenCiudad: {
        localidadId:     String(origenCiudad.localidadId).trim(),
        localidadNombre: String(origenCiudad.localidadNombre).trim(),
      },
      destinoCiudad: {
        localidadId:     String(destinoCiudad.localidadId).trim(),
        localidadNombre: String(destinoCiudad.localidadNombre).trim(),
      },
      paquetes:              paquetesProcesados,
      costo_estimado:        costoCalculado,
      fecha_entrega:         new Date(fecha_entrega),
      franja_horaria_retiro: String(franja_horaria_retiro).trim(),
      fecha_retiro:          null,
      notas_adicionales:     notas_adicionales || '',
      comisionistaId:        comisionistaId || null,
      metodo_pago_cliente:   metodo_pago_cliente || null,
      ...(tripPlanId ? { tripPlanId } : {}),
    });

    const envioGuardado = await nuevoEnvio.save();
    res.status(201).json({ message: 'Envío solicitado con éxito.', envio: envioGuardado });
  } catch (error) {
    next(error);
  }
};

export const getEnviosDisponibles = async (req, res, next) => {
  try {
    const envios = await Envio.find({
      estadoId:       'PENDIENTE',
      comisionistaId: req.userId,
    }).sort({ createdAt: -1 });
    res.status(200).json(envios);
  } catch (error) {
    next(error);
  }
};

export const aceptarEnvio = async (req, res, next) => {
  try {
    const { envioId, vehiculoId, fecha_retiro, franja_horaria_retiro } = req.body;
    const comisionistaId = req.userId;

    const envio = await Envio.findById(envioId);
    if (!envio || envio.estadoId !== 'PENDIENTE')
      return res.status(400).json({ message: 'El envío ya no está disponible o no existe.' });
    if (String(envio.comisionistaId) !== String(comisionistaId))
      return res.status(403).json({ message: 'Este envío no está dirigido a vos.' });

    let viajeYaIniciado = false;
    try {
      const RUTA_BASE = process.env.IA_ROUTE_SERVICE_URL || 'http://localhost:3002';
      const { data } = await axios.get(
        `${RUTA_BASE}/api/rutas/activa/${comisionistaId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
      if (data?._id && data?.viaje_iniciado === true) {
        viajeYaIniciado = sameDayLocal(new Date(data.fecha_viaje), getNow());
      }
    } catch {
      viajeYaIniciado = false;
    }

    function franjaYaInicio(franja) {
      if (!franja) return true;
      if (franja === '00:00-12:00' || franja === '08:00-13:00') return true;
      return getNow().getHours() >= 13;
    }

    const fechaRetiroEsHoy = fecha_retiro
      ? sameDayLocal(new Date(fecha_retiro + 'T12:00:00'), getNow())
      : false;

    const estadoInicial =
      viajeYaIniciado && fechaRetiroEsHoy && franjaYaInicio(franja_horaria_retiro)
        ? 'EN_RETIRO'
        : 'ASIGNADO';

    // Atómico: solo pasa de PENDIENTE → aceptado si nadie lo cambió entre medio
    // (evita que dos pedidos simultáneos acepten el mismo envío).
    const cambios = { estadoId: estadoInicial };
    if (estadoInicial === 'EN_RETIRO') cambios.en_viaje_fecha = getDayRange().inicioDia;
    if (fecha_retiro)          cambios.fecha_retiro          = new Date(fecha_retiro + 'T12:00:00');
    if (franja_horaria_retiro) cambios.franja_horaria_retiro = franja_horaria_retiro;

    const aceptado = await Envio.findOneAndUpdate(
      { _id: envioId, estadoId: 'PENDIENTE', comisionistaId },
      { $set: cambios },
      { new: true }
    );
    if (!aceptado)
      return res.status(409).json({ message: 'El envío ya fue aceptado o dejó de estar disponible.' });

    const nuevaAsignacion = new EnvioXComisionista({
      comisionistaId,
      envioId,
      vehiculoId,
      estado_id: estadoInicial,
      tripPlanId: envio.tripPlanId || null,
    });
    await nuevaAsignacion.save();

    notifEnvioAceptado({ userId: String(envio.usuarioId), envioId: String(envio._id), nroEnvio: envio.nro_envio, comisionistaNombre: 'un comisionista' });

    res.status(200).json({
      message: estadoInicial === 'EN_RETIRO'
        ? '¡Envío aceptado y en retiro! El viaje ya está en curso.'
        : '¡Envío aceptado!',
      asignacion: nuevaAsignacion,
      estadoInicial,
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoEnvio = async (req, res, next) => {
  try {
    const { envioId, nuevoEstado } = req.body;
    const comisionistaId = req.userId;

    // Solo las transiciones manuales de la tabla de estados. Las automáticas
    // (iniciar/finalizar viaje, demorados por fecha) y las cancelaciones
    // tienen sus propios endpoints.
    const TRANSICIONES_VALIDAS = {
      EN_RETIRO:         ['RETIRADO'],
      EN_CAMINO:         ['ENTREGADO'],
      CANCELADO_RETORNO: ['DEVUELTO'],
    };

    const envio = await Envio.findById(envioId);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (String(envio.comisionistaId) !== comisionistaId)
      return res.status(403).json({ message: 'No tenés permiso.' });

    const permitidos = TRANSICIONES_VALIDAS[envio.estadoId] || [];
    if (!permitidos.includes(nuevoEstado))
      return res.status(400).json({
        message: `Transición inválida: ${envio.estadoId} → ${nuevoEstado}. Permitidas: ${permitidos.join(', ')}`,
      });

    envio.estadoId = nuevoEstado;
    await envio.save();

    const datosUpdate = { estado_id: nuevoEstado };
    if (nuevoEstado === 'EN_RETIRO')                     datosUpdate.fecha_inicio_retiro = getNow();
    if (nuevoEstado === 'EN_CAMINO')                     datosUpdate.fecha_inicio        = getNow();
    if (['ENTREGADO', 'DEVUELTO'].includes(nuevoEstado)) datosUpdate.fecha_fin           = getNow();

    await EnvioXComisionista.findOneAndUpdate(
      { envioId, comisionistaId },
      { $set: datosUpdate }
    );

    notifEstadoActualizado({ userId: String(envio.usuarioId), envioId: String(envio._id), nroEnvio: envio.nro_envio, nuevoEstado });

    return res.status(200).json({ message: `Estado actualizado a ${nuevoEstado}.`, estado: nuevoEstado });
  } catch (err) {
    next(err);
  }
};

export const getHistorial = async (req, res, next) => {
  try {
    const userId  = req.userId;
    const userRol = req.userRol;
    let query = {};

    if (userRol === 'cliente')           query = { usuarioId:      userId };
    else if (userRol === 'comisionista') query = { comisionistaId: userId };

    const mostrarArchivados = req.query.archivado === 'true';

    const filtroArchivado =
      userRol === 'comisionista'
        ? {}
        : mostrarArchivados
          ? { archivado: true }
          : { archivado: { $ne: true } };

    const historial = await Envio.find({
      ...query,
      ...filtroArchivado,
      eliminado: { $ne: true },
    }).sort({ createdAt: -1 });

    const AUTH_BASE = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    const token = req.headers.authorization;

    const comisionistaIds = [...new Set(historial.filter(e => e.comisionistaId).map(e => String(e.comisionistaId)))];
    const destinatarioIds = [...new Set(historial.filter(e => e.destinatarioId).map(e => String(e.destinatarioId)))];
    const clienteIds      = [...new Set(historial.filter(e => e.usuarioId).map(e => String(e.usuarioId)))];

    const [nombresComisionistas, nombresDestinatarios, nombresClientes] = await Promise.all([
      Promise.all(comisionistaIds.map(async (cId) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/interno/usuarios/${cId}`, { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } });
          return [cId, `${data.nombre} ${data.apellido}`.trim()];
        } catch { return [cId, null]; }
      })),
      Promise.all(destinatarioIds.map(async (dId) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/interno/destinatarios/${dId}`, { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } });
          return [dId, `${data.apellido} ${data.nombre}`.trim()];
        } catch { return [dId, null]; }
      })),
      Promise.all(clienteIds.map(async (uId) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/interno/usuarios/${uId}`, { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } });
          return [uId, `${data.nombre} ${data.apellido}`.trim()];
        } catch { return [uId, null]; }
      })),
    ]);

    const comisionistaMap = Object.fromEntries(nombresComisionistas);
    const destinatarioMap = Object.fromEntries(nombresDestinatarios);
    const clienteMap      = Object.fromEntries(nombresClientes);

    const historialEnriquecido = historial.map(e => ({
      ...e.toObject(),
      nombreComisionista: e.comisionistaId ? (comisionistaMap[String(e.comisionistaId)] || null) : null,
      nombreDestinatario: e.destinatarioId ? (destinatarioMap[String(e.destinatarioId)] || null) : null,
      nombreCliente:      e.usuarioId      ? (clienteMap[String(e.usuarioId)]           || null) : null,
    }));

    res.status(200).json({
      totalEnvios:    historial.length,
      totalFacturado: userRol === 'comisionista'
        ? historial.reduce((acc, e) => acc + e.costo_estimado, 0)
        : undefined,
      historial: historialEnriquecido,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { direccion_origen, direccion_destino, origenCiudad, destinoCiudad, notas_adicionales, paquetes } = req.body;

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (envio.usuarioId.toString() !== req.userId)
      return res.status(403).json({ message: 'No tienes permiso.' });
    if (envio.estadoId !== 'PENDIENTE')
      return res.status(400).json({ message: 'No puedes editar un envío ya aceptado.' });

    let datosActualizados = { direccion_origen, direccion_destino, origenCiudad, destinoCiudad, notas_adicionales };

    if (paquetes && paquetes.length > 0) {
      datosActualizados.costo_estimado = paquetes.length * 1200;
      datosActualizados.paquetes = paquetes.map((p, index) => ({
        ...p,
        clienteId:      req.userId,
        codigo_paquete: `B-${envio.nro_envio}-${index + 1}`,
      }));
    }

    const envioActualizado = await Envio.findByIdAndUpdate(
      id, { $set: datosActualizados }, { new: true, runValidators: true }
    );

    res.status(200).json({ message: 'Envío actualizado y costo recalculado.', envio: envioActualizado });
  } catch (error) {
    next(error);
  }
};

export const cancelarEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const envio = await Envio.findById(id);

    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (envio.usuarioId.toString() !== req.userId)
      return res.status(403).json({ message: 'No tenés permiso.' });

    const CANCELABLE_SIN_RETORNO = ['PENDIENTE', 'ASIGNADO', 'EN_RETIRO', 'DEMORADO_RETIRO'];
    const CANCELABLE_CON_RETORNO = ['RETIRADO', 'EN_CAMINO', 'DEMORADO_ENTREGA'];

    if (CANCELABLE_SIN_RETORNO.includes(envio.estadoId)) {
      await Envio.updateOne({ _id: id }, { $set: { estadoId: 'CANCELADO' } });
      await EnvioXComisionista.findOneAndUpdate({ envioId: id }, { $set: { estado_id: 'CANCELADO' } });
      if (envio.comisionistaId) {
        notifCanceladoPorCliente({ userId: String(envio.comisionistaId), envioId: String(envio._id), nroEnvio: envio.nro_envio });
      }
      return res.status(200).json({ message: 'Envío cancelado.' });
    }

    if (CANCELABLE_CON_RETORNO.includes(envio.estadoId)) {
      let waLink = null;
      let notasExtra = '';
      try {
        const AUTH_BASE = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
        const { data: comisionista } = await axios.get(
          `${AUTH_BASE}/api/auth/interno/usuarios/${envio.comisionistaId}`,
          { headers: { 'x-internal-key': process.env.INTERNAL_API_KEY } }
        );
        const msj = `Hola ${comisionista.nombre}, el envío ${envio.nro_envio} fue cancelado. ¿Podés coordinar la devolución?`;
        waLink = `https://wa.me/${comisionista.telefono}?text=${encodeURIComponent(msj)}`;
        notasExtra = ` [CANCELADO EN TRÁNSITO - DEVOLVER A: ${comisionista.telefono}]`;
      } catch {}

      // Tabla de estados: pasa a CANCELADO; el comisionista luego lo marca
      // "en devolución" (RUMBO ORIGEN) con el viaje iniciado, y finalmente DEVUELTO.
      // (notas_adicionales es texto: se concatena, no se usa $push)
      await Envio.updateOne(
        { _id: id },
        { $set: {
          estadoId: 'CANCELADO',
          requiere_devolucion: true,
          ...(notasExtra ? { notas_adicionales: `${envio.notas_adicionales || ''}${notasExtra}` } : {}),
        } }
      );
      await EnvioXComisionista.findOneAndUpdate({ envioId: id }, { $set: { estado_id: 'CANCELADO' } });
      if (envio.comisionistaId) {
        notifCanceladoPorCliente({ userId: String(envio.comisionistaId), envioId: String(envio._id), nroEnvio: envio.nro_envio });
      }
      return res.status(200).json({ message: 'Envío cancelado. Como el paquete ya fue retirado, el comisionista lo devolverá al origen.', waLink });
    }

    return res.status(400).json({ message: `No se puede cancelar en estado ${envio.estadoId}.` });
  } catch (err) {
    next(err);
  }
};

export const getEnviosPorFecha = async (req, res, next) => {
  try {
    const { comisionistaId } = req.params;
    if (comisionistaId !== req.userId && req.userRol !== 'admin')
      return res.status(403).json({ message: 'Acceso denegado.' });
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ message: 'La fecha es obligatoria.' });
    const { inicioDia, finDia } = getDayRange(fecha);

    const [enCurso, asignadosHoy] = await Promise.all([
      Envio.find({
        comisionistaId,
        $or: [
          { estadoId: { $in: ['EN_RETIRO', 'EN_CAMINO', 'DEMORADO_RETIRO', 'DEMORADO_ENTREGA', 'CANCELADO_RETORNO'] } },
          { estadoId: 'RETIRADO', fecha_entrega: { $gte: inicioDia, $lte: finDia } },
        ],
      }).lean(),
      Envio.find({
        comisionistaId,
        estadoId:    'ASIGNADO',
        fecha_retiro: { $gte: new Date(fecha + 'T00:00:00.000Z'), $lte: new Date(fecha + 'T23:59:59.999Z') },
      }).lean(),
    ]);

    res.status(200).json([...enCurso, ...asignadosHoy]);
  } catch (error) {
    next(error);
  }
};

export const getEnvioById = async (req, res, next) => {
  try {
    const envio = await Envio.findById(req.params.id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado' });
    // Por la ruta interna (x-internal-key) no hay req.userId: se permite.
    // Por la pública: solo el cliente dueño o el comisionista asignado.
    if (req.userId) {
      const esDueno        = String(envio.usuarioId)      === String(req.userId);
      const esComisionista = String(envio.comisionistaId) === String(req.userId);
      if (!esDueno && !esComisionista)
        return res.status(403).json({ message: 'No tenés permiso para ver este envío.' });
    }
    res.status(200).json(envio);
  } catch (error) {
    next(error);
  }
};

// Toma de req.body solo los campos permitidos (el resto se ignora)
const pickCampos = (body, permitidos) =>
  Object.fromEntries(Object.entries(body || {}).filter(([k]) => permitidos.includes(k)));

// PATCH /:id (usuario) → solo el comisionista asignado, solo fecha_retiro
export const patchEnvioTecnico = async (req, res, next) => {
  try {
    const cambios = pickCampos(req.body, ['fecha_retiro']);
    if (!Object.keys(cambios).length)
      return res.status(400).json({ message: 'No hay campos permitidos para actualizar.' });

    const envioActualizado = await Envio.findOneAndUpdate(
      { _id: req.params.id, comisionistaId: req.userId },
      { $set: cambios },
      { new: true, runValidators: true }
    );
    if (!envioActualizado) return res.status(404).json({ message: 'Envío no encontrado o no autorizado.' });
    res.status(200).json(envioActualizado);
  } catch (error) {
    next(error);
  }
};

// PATCH /interno/:id (microservicios, x-internal-key) → solo datos técnicos de ruta
export const patchEnvioInterno = async (req, res, next) => {
  try {
    const cambios = pickCampos(req.body, ['polyline_especifica']);
    if (!Object.keys(cambios).length)
      return res.status(400).json({ message: 'No hay campos permitidos para actualizar.' });

    const envioActualizado = await Envio.findByIdAndUpdate(
      req.params.id, { $set: cambios }, { new: true, runValidators: true }
    );
    if (!envioActualizado) return res.status(404).json({ message: 'Envío no encontrado.' });
    res.status(200).json(envioActualizado);
  } catch (error) {
    next(error);
  }
};

export const confirmarComisionista = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tripPlanId, comisionistaId, fecha_retiro } = req.body;

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (envio.usuarioId.toString() !== req.userId)
      return res.status(403).json({ message: 'No tienes permiso.' });
    if (envio.estadoId !== 'PENDIENTE')
      return res.status(400).json({ message: 'Solo podés confirmar comisionista si está PENDIENTE.' });

    const bultos = Array.isArray(envio.paquetes) ? envio.paquetes.length : 0;
    if (bultos <= 0) return res.status(400).json({ message: 'El envío no tiene paquetes.' });

    const VIAJES_BASE = process.env.VIAJES_BASE_URL || 'http://localhost:3004';
    const r = await axios.get(`${VIAJES_BASE}/api/search/precio`, {
      params: {
        tripPlanId,
        destinoLocalidadId:     envio.destinoCiudad.localidadId,
        destinoLocalidadNombre: envio.destinoCiudad.localidadNombre,
        origenLocalidadId:      envio.origenCiudad.localidadId,
        origenLocalidadNombre:  envio.origenCiudad.localidadNombre,
        bultos,
      },
    });

    const { total, comisionistaId: comiDelTrip } = r.data;
    if (String(comiDelTrip) !== String(comisionistaId))
      return res.status(400).json({ message: 'El tripPlanId no corresponde al comisionista indicado.' });

    envio.tripPlanId      = tripPlanId;
    envio.comisionistaId  = comisionistaId;
    envio.costo_estimado  = total;
    if (fecha_retiro) envio.fecha_retiro = new Date(fecha_retiro + 'T12:00:00');
    await envio.save();

    return res.json({ message: 'Comisionista confirmado y precio fijado.', envio });
  } catch (err) {
    next(err);
  }
};

export const archivarEnvio = async (req, res, next) => {
  try {
    const envio = await Envio.findById(req.params.id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (envio.usuarioId.toString() !== req.userId)
      return res.status(403).json({ message: 'No tienes permiso.' });
    envio.archivado = true;
    await envio.save();
    res.status(200).json({ message: 'Envío archivado.' });
  } catch (error) { next(error); }
};

export const getEnviosParaRuta = async (req, res, next) => {
  try {
    const { comisionistaId } = req.params;
    if (comisionistaId !== req.userId && req.userRol !== 'admin')
      return res.status(403).json({ message: 'Acceso denegado.' });

    const { fecha } = req.query;
    const { inicioDia, finDia } = getDayRange(fecha);

    const [enCurso, asignadosHoy] = await Promise.all([
      Envio.find({
        comisionistaId,
        $or: [
          { estadoId: { $in: ['EN_RETIRO', 'EN_CAMINO', 'DEMORADO_RETIRO', 'DEMORADO_ENTREGA', 'CANCELADO_RETORNO'] } },
          { estadoId: 'RETIRADO', fecha_entrega: { $gte: inicioDia, $lte: finDia } },
        ],
      }).lean(),
      fecha
        ? Envio.find({
            comisionistaId,
            estadoId:    'ASIGNADO',
            fecha_retiro: { $gte: new Date(fecha + 'T00:00:00.000Z'), $lte: new Date(fecha + 'T23:59:59.999Z') },
          }).lean()
        : [],
    ]);

    const todos = [...enCurso, ...asignadosHoy];
    if (!todos.length) return res.status(404).json({ message: 'No hay envíos para este día.' });
    res.status(200).json(todos);
  } catch (error) {
    next(error);
  }
};

export const eliminarEnvioLogico = async (req, res, next) => {
  try {
    const envio = await Envio.findById(req.params.id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (envio.usuarioId.toString() !== req.userId)
      return res.status(403).json({ message: 'No tienes permiso.' });
    envio.eliminado = true;
    await envio.save();
    res.status(200).json({ message: 'Envío eliminado.' });
  } catch (error) { next(error); }
};

export const marcarRetirado = async (req, res, next) => {
  try {
    const { id }           = req.params;
    const comisionistaId   = req.userId;

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (String(envio.comisionistaId) !== comisionistaId)
      return res.status(403).json({ message: 'No tenés permiso.' });
    // Tabla de estados: solo EN RETIRO → RETIRADO (el viaje tiene que estar iniciado)
    if (envio.estadoId !== 'EN_RETIRO')
      return res.status(400).json({ message: `Solo se puede marcar como retirado un envío EN RETIRO (estado actual: ${envio.estadoId}). Iniciá el viaje del día.` });

    // Por defecto RETIRADO; si hay viaje activo siempre pasa a EN_CAMINO.
    // Esto cubre tanto envíos normales como demorados de días anteriores
    // (cuya fecha_entrega puede ser pasada pero igual se entregan en el viaje actual).
    let nuevoEstado = 'RETIRADO';
    try {
      const RUTA_BASE = process.env.IA_ROUTE_SERVICE_URL || 'http://localhost:3002';
      const { data } = await axios.get(
        `${RUTA_BASE}/api/rutas/activa/${comisionistaId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
      const { finDia } = getDayRange();
      const entregaEsHoyOAntes = !envio.fecha_entrega || new Date(envio.fecha_entrega) <= finDia;
      if (data?._id && data?.viaje_iniciado === true && entregaEsHoyOAntes) {
        nuevoEstado = 'EN_CAMINO';
      }
    } catch { /* si no hay ruta activa o falla, queda RETIRADO */ }

    envio.estadoId = nuevoEstado;
    if (nuevoEstado === 'EN_CAMINO') envio.en_viaje_fecha = getDayRange().inicioDia;
    await envio.save();

    await EnvioXComisionista.findOneAndUpdate(
      { envioId: id, comisionistaId },
      { $set: { estado_id: nuevoEstado, fecha_retiro_efectiva: getNow() } }
    );

    notifRetiroConfirmado({ userId: String(envio.usuarioId), envioId: String(envio._id), nroEnvio: envio.nro_envio });
    if (nuevoEstado === 'EN_CAMINO') {
      notifEstadoActualizado({ userId: String(envio.usuarioId), envioId: String(envio._id), nroEnvio: envio.nro_envio, nuevoEstado: 'EN_CAMINO' });
    }

    return res.status(200).json({
      message: nuevoEstado === 'EN_CAMINO'
        ? 'Paquete retirado — en camino.'
        : 'Paquete marcado como retirado.',
      estado: nuevoEstado,
    });
  } catch (err) {
    next(err);
  }
};

export const marcarEntregado = async (req, res, next) => {
  try {
    const { id }         = req.params;
    const comisionistaId = req.userId;

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (String(envio.comisionistaId) !== comisionistaId)
      return res.status(403).json({ message: 'No tenés permiso.' });
    if (envio.estadoId !== 'EN_CAMINO')
      return res.status(400).json({ message: `Solo se puede marcar como entregado un envío EN CAMINO (estado actual: ${envio.estadoId}).` });

    envio.estadoId = 'ENTREGADO';
    await envio.save();

    await EnvioXComisionista.findOneAndUpdate(
      { envioId: id, comisionistaId },
      { $set: { estado_id: 'ENTREGADO', fecha_fin: getNow() } }
    );

    return res.status(200).json({ message: 'Envío entregado.', estado: 'ENTREGADO' });
  } catch (err) {
    next(err);
  }
};

export const iniciarViaje = async (req, res, next) => {
  try {
    const comisionistaId = req.userId;
    const { inicioDia, finDia } = getDayRange(req.body.fecha);

    // Lo vencido de días anteriores pasa primero a DEMORADO (y abajo se reactiva)
    await marcarDemoradosPorFecha({ comisionistaId });

    // Envíos ASIGNADOS de hoy con franja mañana → EN_RETIRO
    const resManana = await Envio.updateMany(
      {
        comisionistaId,
        estadoId:    'ASIGNADO',
        fecha_retiro: { $gte: inicioDia, $lte: finDia },
        $or: [
          { franja_horaria_retiro: { $exists: false } },
          { franja_horaria_retiro: null },
          { franja_horaria_retiro: '' },
          { franja_horaria_retiro: '08:00-13:00' },
          { franja_horaria_retiro: '00:00-12:00' },
        ],
      },
      { $set: { estadoId: 'EN_RETIRO', en_viaje_fecha: inicioDia } }
    );

    // Envíos RETIRADOS de hoy → EN_CAMINO
    const resRetirados = await Envio.updateMany(
      {
        comisionistaId,
        estadoId:     'RETIRADO',
        fecha_entrega: { $gte: inicioDia, $lte: finDia },
      },
      { $set: { estadoId: 'EN_CAMINO', en_viaje_fecha: inicioDia } }
    );

    // Envíos DEMORADOS de cualquier día → reactivar para el nuevo viaje
    // DEMORADO_RETIRO → EN_RETIRO (aún no fueron retirados)
    const resDemoradosRetiro = await Envio.updateMany(
      { comisionistaId, estadoId: 'DEMORADO_RETIRO' },
      { $set: { estadoId: 'EN_RETIRO', en_viaje_fecha: inicioDia } }
    );

    // DEMORADO_ENTREGA → EN_CAMINO (ya fueron retirados, falta entregar)
    const resDemoradosEntrega = await Envio.updateMany(
      { comisionistaId, estadoId: 'DEMORADO_ENTREGA' },
      { $set: { estadoId: 'EN_CAMINO', en_viaje_fecha: inicioDia } }
    );

    return res.status(200).json({
      message:          '¡Buen viaje!',
      enRetiro:         resManana.modifiedCount,
      enCamino:         resRetirados.modifiedCount,
      demoradosRetiro:  resDemoradosRetiro.modifiedCount,
      demoradosEntrega: resDemoradosEntrega.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

export const lazyUpdateEstados = async (req, res, next) => {
  try {
    const comisionistaId = req.userId;
    const ahora      = getNow();
    const horaActual = ahora.getHours();

    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0,  0,  0,   0);
    const finDia    = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    const asignadosHoy = await Envio.find({
      comisionistaId,
      estadoId:              'ASIGNADO',
      fecha_retiro:          { $gte: inicioDia, $lte: finDia },
      franja_horaria_retiro: { $in: ['12:00-23:59', '13:00-17:00', '17:00-20:00'] },
    });

    const idsParaActivar = asignadosHoy
      .filter(e => franjaIniciada(e.franja_horaria_retiro, horaActual))
      .map(e => e._id);

    let activados = 0;
    if (idsParaActivar.length > 0) {
      const result = await Envio.updateMany(
        { _id: { $in: idsParaActivar } },
        { $set: { estadoId: 'EN_RETIRO', en_viaje_fecha: inicioDia } }
      );
      activados = result.modifiedCount;
    }

    return res.status(200).json({ activados });
  } catch (err) {
    next(err);
  }
};

export const cancelarPorComisionista = async (req, res, next) => {
  try {
    const { id }         = req.params;
    const comisionistaId = req.userId;

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (String(envio.comisionistaId) !== comisionistaId)
      return res.status(403).json({ message: 'No tenés permiso.' });

    const SIN_RETORNO = ['PENDIENTE', 'ASIGNADO', 'EN_RETIRO', 'DEMORADO_RETIRO'];
    const CON_RETORNO = ['RETIRADO', 'EN_CAMINO', 'DEMORADO_ENTREGA'];

    if (SIN_RETORNO.includes(envio.estadoId)) {
      await Envio.updateOne({ _id: id }, { $set: { estadoId: 'CANCELADO' } });
      await EnvioXComisionista.findOneAndUpdate(
        { envioId: id, comisionistaId }, { $set: { estado_id: 'CANCELADO' } }
      );
      notifCanceladoPorComisionista({ userId: String(envio.usuarioId), envioId: String(envio._id), nroEnvio: envio.nro_envio });
      return res.status(200).json({ message: 'Envío cancelado.' });
    }

    if (CON_RETORNO.includes(envio.estadoId)) {
      // Tabla de estados: CANCELADO; después "Marcar en devolución" → RUMBO ORIGEN → DEVUELTO
      await Envio.updateOne({ _id: id }, { $set: { estadoId: 'CANCELADO', requiere_devolucion: true } });
      await EnvioXComisionista.findOneAndUpdate(
        { envioId: id, comisionistaId }, { $set: { estado_id: 'CANCELADO' } }
      );
      notifCanceladoPorComisionista({ userId: String(envio.usuarioId), envioId: String(envio._id), nroEnvio: envio.nro_envio });
      return res.status(200).json({ message: 'Envío cancelado. Marcalo "en devolución" cuando inicies el viaje para llevarlo al origen.' });
    }

    return res.status(400).json({ message: `No se puede cancelar en estado ${envio.estadoId}.` });
  } catch (err) {
    next(err);
  }
};

export const confirmarPago = async (req, res, next) => {
  try {
    const { id }         = req.params;
    const comisionistaId = req.userId;
    const { metodo }     = req.body;

    const revertir = metodo === null || metodo === undefined;

    if (!revertir && !['efectivo', 'transferencia'].includes(metodo))
      return res.status(400).json({ message: 'Método de pago inválido. Usá "efectivo", "transferencia" o null para revertir.' });

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (String(envio.comisionistaId) !== comisionistaId)
      return res.status(403).json({ message: 'No tenés permiso.' });

    envio.pago = revertir
      ? { confirmado: false, metodo: null, fecha: null }
      : { confirmado: true, metodo, fecha: getNow() };
    await envio.save();

    return res.status(200).json({
      message: revertir ? 'Pago revertido a pendiente.' : 'Pago confirmado.',
      pago: envio.pago,
    });
  } catch (err) {
    next(err);
  }
};

export const archivarEnvioComisionista = async (req, res, next) => {
  try {
    const envio = await Envio.findById(req.params.id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (String(envio.comisionistaId) !== req.userId)
      return res.status(403).json({ message: 'No tenés permiso.' });

    const ARCHIVABLES = ['ENTREGADO', 'CANCELADO', 'CANCELADO_RETORNO', 'DEVUELTO'];
    if (!ARCHIVABLES.includes(envio.estadoId))
      return res.status(400).json({ message: `No se puede archivar en estado ${envio.estadoId}.` });

    envio.archivado = true;
    await envio.save();
    res.status(200).json({ message: 'Envío archivado.' });
  } catch (error) { next(error); }
};


/* ─── Devolución (tabla de estados) ──────────────────────────────────────────
   CANCELADO (requiere_devolucion) → RUMBO ORIGEN (CANCELADO_RETORNO) → DEVUELTO */

// PATCH /:id/marcar-en-devolucion — requiere el viaje iniciado
export const marcarEnDevolucion = async (req, res, next) => {
  try {
    const { id }         = req.params;
    const comisionistaId = req.userId;

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (String(envio.comisionistaId) !== comisionistaId)
      return res.status(403).json({ message: 'No tenés permiso.' });
    if (envio.estadoId !== 'CANCELADO' || !envio.requiere_devolucion)
      return res.status(400).json({ message: 'Solo se puede devolver un envío cancelado con el paquete ya retirado.' });

    let viajeIniciado = false;
    try {
      const RUTA_BASE = process.env.IA_ROUTE_SERVICE_URL || 'http://localhost:3002';
      const { data } = await axios.get(
        `${RUTA_BASE}/api/rutas/activa/${comisionistaId}`,
        { headers: { Authorization: req.headers.authorization } }
      );
      viajeIniciado = Boolean(data?._id && data?.viaje_iniciado === true);
    } catch { viajeIniciado = false; }

    if (!viajeIniciado)
      return res.status(400).json({ message: 'Iniciá el viaje del día para poder llevar el paquete de vuelta al origen.' });

    envio.estadoId       = 'CANCELADO_RETORNO';
    envio.en_viaje_fecha = getDayRange().inicioDia;
    await envio.save();
    await EnvioXComisionista.findOneAndUpdate(
      { envioId: id, comisionistaId }, { $set: { estado_id: 'CANCELADO_RETORNO' } }
    );

    return res.status(200).json({ message: 'Paquete rumbo al origen.', estado: 'CANCELADO_RETORNO' });
  } catch (err) {
    next(err);
  }
};

// PATCH /:id/marcar-devuelto
export const marcarDevuelto = async (req, res, next) => {
  try {
    const { id }         = req.params;
    const comisionistaId = req.userId;

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: 'Envío no encontrado.' });
    if (String(envio.comisionistaId) !== comisionistaId)
      return res.status(403).json({ message: 'No tenés permiso.' });
    if (envio.estadoId !== 'CANCELADO_RETORNO')
      return res.status(400).json({ message: 'Solo se puede marcar como devuelto un envío rumbo al origen.' });

    envio.estadoId            = 'DEVUELTO';
    envio.requiere_devolucion = false;
    await envio.save();
    await EnvioXComisionista.findOneAndUpdate(
      { envioId: id, comisionistaId }, { $set: { estado_id: 'DEVUELTO', fecha_fin: getNow() } }
    );

    return res.status(200).json({ message: 'Paquete devuelto al origen.', estado: 'DEVUELTO' });
  } catch (err) {
    next(err);
  }
};
