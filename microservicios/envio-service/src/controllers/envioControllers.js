//microservicios\envio-service\src\controllers\envioControllers.js
import Envio from '../models/envioModels.js';
import EnvioXComisionista from '../models/envioXcomisionistaModel.js';
import axios from 'axios';

export const createEnvio = async (req, res, next) => {
  try {
    const {
      direccion_origen,
      direccion_destino,
      origenCiudad,
      destinoCiudad,
      paquetes,
      fecha_entrega,          // ✅ solo fecha
      franja_horaria_retiro,  // ✅ franja elegida por el cliente
      notas_adicionales,
      comisionistaId,
      tripPlanId,
      destinatarioId,
    } = req.body;

    if (!paquetes || !Array.isArray(paquetes) || paquetes.length === 0) {
      return res.status(400).json({ message: "Debes incluir al menos un paquete en el envío." });
    }

    const validDir = (d) =>
      d && typeof d === "object" && typeof d.texto === "string" && d.texto.trim().length > 0;

    if (!validDir(direccion_origen)) {
      return res.status(400).json({ message: "direccion_origen debe ser { texto, lat, lng } válido." });
    }
    if (!validDir(direccion_destino)) {
      return res.status(400).json({ message: "direccion_destino debe ser { texto, lat, lng } válido." });
    }
    if (
      !origenCiudad ||
      typeof origenCiudad !== "object" ||
      !origenCiudad.localidadId ||
      !origenCiudad.localidadNombre
    ) {
      return res.status(400).json({ message: "origenCiudad inválido." });
    }

    if (
      !destinoCiudad ||
      typeof destinoCiudad !== "object" ||
      !destinoCiudad.localidadId ||
      !destinoCiudad.localidadNombre
    ) {
      return res.status(400).json({ message: "destinoCiudad inválido." });
    }
    if (!fecha_entrega) {
      return res.status(400).json({ message: "fecha_entrega es obligatoria." });
    }
    if (!franja_horaria_retiro?.trim()) {
      return res.status(400).json({ message: "franja_horaria_retiro es obligatoria (ej: '08:00-12:00')." });
    }

    const TARIFA_POR_BULTO = 1200;
    const costoCalculado = paquetes.length * TARIFA_POR_BULTO;

    const ahora = new Date();
    const prefijo = `FD-${ahora.getFullYear().toString().slice(-2)}${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const nroEnvioUnico = `${prefijo}-${Math.floor(1000 + Math.random() * 9000)}`;

    const paquetesProcesados = paquetes.map((p, i) => ({
      ...p,
      clienteId: req.userId,
      codigo_paquete: `B-${nroEnvioUnico}-${i + 1}`,
    }));

    const nuevoEnvio = new Envio({
      usuarioId: req.userId,
      destinatarioId: destinatarioId || null,
      nro_envio: nroEnvioUnico,
      direccion_origen,
      direccion_destino,
      origenCiudad: {
        localidadId: String(origenCiudad.localidadId).trim(),
        localidadNombre: String(origenCiudad.localidadNombre).trim(),
      },

      destinoCiudad: {
        localidadId: String(destinoCiudad.localidadId).trim(),
        localidadNombre: String(destinoCiudad.localidadNombre).trim(),
      },
      paquetes: paquetesProcesados,
      costo_estimado: costoCalculado,
      fecha_entrega: new Date(fecha_entrega),
      franja_horaria_retiro: String(franja_horaria_retiro).trim(),
      fecha_retiro: null,   // ← la decide el comisionista
      notas_adicionales: notas_adicionales || "",
      comisionistaId: comisionistaId || null,
      ...(tripPlanId ? { tripPlanId } : {}),
    });

    const envioGuardado = await nuevoEnvio.save();

    res.status(201).json({
      message: "Envío solicitado con éxito.",
      envio: envioGuardado,
    });
  } catch (error) {
    next(error);
  }
};

export const getEnviosDisponibles = async (req, res, next) => {
  try {
    const comisionistaId = req.userId;

    const envios = await Envio.find({
      estadoId: 'PENDIENTE',
      comisionistaId: comisionistaId,
    }).sort({ createdAt: -1 });

    res.status(200).json(envios);
  } catch (error) {
    next(error);
  }
};

export const aceptarEnvio = async (req, res, next) => {
  try {
    const { envioId, vehiculoId } = req.body;
    const comisionistaId = req.userId; // Viene del token
    const tripPlanId = req.body

    // 1. Buscamos el envío para ver si sigue disponible
    const envio = await Envio.findById(envioId);
    if (!envio || envio.estadoId !== 'PENDIENTE') {
      return res.status(400).json({ message: "El envío ya no está disponible o no existe." });
    }

    // 2. CREAMOS LA ASIGNACIÓN (Tabla envio_x_comisionista)
    const nuevaAsignacion = new EnvioXComisionista({
      comisionistaId,
      envioId,
      vehiculoId,
      estado_id: 'ASIGNADO',
      tripPlanId: envio.tripPlanId || null,
    });
    await nuevaAsignacion.save();

    // 3. ACTUALIZAMOS EL ENVÍO ORIGINAL
    envio.comisionistaId = comisionistaId;
    envio.estadoId = 'ASIGNADO';
    await envio.save();

    res.status(200).json({
      message: "Envío aceptado correctamente. ¡Buen viaje!",
      asignacion: nuevaAsignacion
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarEstadoEnvio = async (req, res, next) => {
  try {
    const { envioId, nuevoEstado } = req.body;
    const comisionistaId = req.userId; // Viene del token de Marta

    // 1. Buscamos el envío
    const envio = await Envio.findById(envioId);
    if (!envio) return res.status(404).json({ message: "Envío no encontrado." });

    // 2. Seguridad: Solo Marta puede actualizar SU viaje
    if (envio.comisionistaId.toString() !== comisionistaId) {
      return res.status(403).json({ message: "No tienes permiso para actualizar este envío." });
    }

    // 1. Validaciones de lógica de estados
    if (nuevoEstado === 'DEVUELTO' && envio.estadoId !== 'CANCELADO_RETORNO') {
      return res.status(400).json({ message: "Solo se puede marcar como DEVUELTO si fue cancelado en tránsito." });
    }


    // 3. Actualizamos el estado en el envío principal
    envio.estadoId = nuevoEstado;
    await envio.save();

    // 4. Actualizamos la tabla intermedia y guardamos fechas si corresponde
    const datosUpdate = { estado_id: nuevoEstado };

    if (nuevoEstado === 'EN_RETIRO') {
      datosUpdate.fecha_retiro = Date.now();
    }

    // CASO B: Marta ya tiene el paquete y sale hacia el destino
    if (nuevoEstado === 'EN_CAMINO') {
      datosUpdate.fecha_inicio = Date.now();
    }

    // C. ¡NUEVO! Registra cuándo ocurrió un inconveniente
    if (nuevoEstado === 'DEMORADO') {
      datosUpdate.fecha_demora = Date.now();
    }
    // CASO C: El ciclo termina (Ya sea por entrega exitosa o devolución)
    if (nuevoEstado === 'ENTREGADO' || nuevoEstado === 'DEVUELTO') {
      datosUpdate.fecha_fin = Date.now();
    }

    await EnvioXComisionista.findOneAndUpdate(
      { envioId: envioId, comisionistaId: comisionistaId },
      { $set: datosUpdate }
    );

    res.status(200).json({
      message: `Envío actualizado a: ${nuevoEstado}`,
      estado: nuevoEstado
    });
  } catch (error) {
    next(error);
  }
};

export const getHistorial = async (req, res, next) => {
  try {
    const userId = req.userId;
    const userRol = req.userRol;
    let query = {};

    if (userRol === 'cliente') query = { usuarioId: userId };
    else if (userRol === 'comisionista') query = { comisionistaId: userId };

    const mostrarArchivados = req.query.archivado === "true";

    const historial = await Envio.find({
      ...query,
      eliminado: { $ne: true },
      archivado: mostrarArchivados ? true : { $ne: true },
    }).sort({ createdAt: -1 });

    const AUTH_BASE = process.env.AUTH_SERVICE_URL || "http://localhost:3000";
    const token = req.headers.authorization;

    // ✅ IDs únicos de comisionistas Y destinatarios
    const comisionistaIds = [...new Set(
      historial.filter(e => e.comisionistaId).map(e => String(e.comisionistaId))
    )];

    const destinatarioIds = [...new Set(
      historial.filter(e => e.destinatarioId).map(e => String(e.destinatarioId))
    )];

const clienteIds = [...new Set(
      historial.filter(e => e.usuarioId).map(e => String(e.usuarioId))
    )];

    // ✅ Fetch en paralelo
    const [nombresComisionistas, nombresDestinatarios, nombresClientes] = await Promise.all([
      // Comisionistas → GET /api/auth/:id
      Promise.all(comisionistaIds.map(async (cId) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/${cId}`, {
            headers: { Authorization: token },
          });
          return [cId, `${data.nombre} ${data.apellido}`.trim()];
        } catch {
          return [cId, null];
        }
      })),

      // Destinatarios → GET /api/auth/destinatarios/:id (endpoint nuevo, ver abajo)
      Promise.all(destinatarioIds.map(async (dId) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/destinatarios/${dId}`, {
            headers: { Authorization: token },
          });
          return [dId, `${data.apellido} ${data.nombre}`.trim()];
        } catch {
          return [dId, null];
        }
      })),

Promise.all(clienteIds.map(async (uId) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/${uId}`, {
            headers: { Authorization: token },
          });
          return [uId, `${data.nombre} ${data.apellido}`.trim()];
        } catch {
          return [uId, null];
        }
      })),

    ]);

    const comisionistaMap = Object.fromEntries(nombresComisionistas);
    const destinatarioMap = Object.fromEntries(nombresDestinatarios);
    const clienteMap      = Object.fromEntries(nombresClientes);

    const historialEnriquecido = historial.map(e => ({
      ...e.toObject(),
      nombreComisionista: e.comisionistaId ? (comisionistaMap[String(e.comisionistaId)] || null) : null,
      nombreDestinatario: e.destinatarioId ? (destinatarioMap[String(e.destinatarioId)] || null) : null,
      nombreCliente:      e.usuarioId      ? (clienteMap[String(e.usuarioId)] || null)      : null,
    }));

    res.status(200).json({
      totalEnvios: historial.length,
      totalFacturado: userRol === 'comisionista'
        ? historial.reduce((acc, e) => acc + e.costo_estimado, 0)
        : undefined,
      historial: historialEnriquecido,
    });
  } catch (error) {
    next(error);
  }
};

//editar envio solo si esta penmdiente 
export const updateEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Extraemos paquetes también del body
    const { direccion_origen, direccion_destino, origenCiudad, destinoCiudad, notas_adicionales, paquetes } = req.body;

    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: "Envío no encontrado." });

    if (envio.usuarioId.toString() !== req.userId) {
      return res.status(403).json({ message: "No tienes permiso." });
    }

    if (envio.estadoId !== 'PENDIENTE') {
      return res.status(400).json({ message: "No puedes editar un envío ya aceptado." });
    }

    // --- LÓGICA DE ACTUALIZACIÓN ---
    let datosActualizados = { direccion_origen, direccion_destino, origenCiudad, destinoCiudad, notas_adicionales };

    // Si el cliente mandó una nueva lista de paquetes, recalculamos todo
    if (paquetes && paquetes.length > 0) {
      const TARIFA_POR_BULTO = 1200;
      datosActualizados.costo_estimado = paquetes.length * TARIFA_POR_BULTO;

      // Volvemos a generar los códigos de bulto para que coincidan con la nueva lista
      datosActualizados.paquetes = paquetes.map((p, index) => ({
        ...p,
        clienteId: req.userId,
        codigo_paquete: `B-${envio.nro_envio}-${index + 1}`
      }));
    }

    const envioActualizado = await Envio.findByIdAndUpdate(
      id,
      { $set: datosActualizados },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Envío actualizado y costo recalculado.",
      envio: envioActualizado
    });
  } catch (error) {
    next(error);
  }
};

//cancelar envio logico (estado cancelado o cancelado_retorno dependiendo si ya fue aceptado o no)

export const cancelarEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const envio = await Envio.findById(id);

    if (!envio) return res.status(404).json({ message: "Envío no encontrado." });
    if (envio.usuarioId.toString() !== req.userId) {
      return res.status(403).json({ message: "No tienes permiso." });
    }

    // CASO 1: Envío todavía no aceptado (Cancelación normal)
    if (envio.estadoId === 'PENDIENTE') {
      envio.estadoId = 'CANCELADO';
      await envio.save();
      return res.status(200).json({ message: "Envío cancelado correctamente." });
    }

    // CASO 2: Envío en tránsito (Logística Inversa)
    if (envio.estadoId === 'EN_CAMINO' || envio.estadoId === 'ASIGNADO' || envio.estadoId === 'EN_RETIRO' || envio.estadoId === 'DEMORADO') {

      // --- INTEGRACIÓN ENTRE MICROS ---
      // 2. Le pedimos los datos al Micro de Usuarios (asumiendo que corre en el puerto 3000)
      const urlUsuarios = `http://localhost:3000/api/auth/usuarios/${envio.comisionistaId}`;

      const respuesta = await axios.get(urlUsuarios, {
        headers: { Authorization: req.headers.authorization } // Le pasamos el token de Ana para que el otro micro la deje pasar
      });

      // Buscamos los datos del comisionista para el WhatsApp
      const comisionista = respuesta.data;

      envio.estadoId = 'CANCELADO_RETORNO';
      envio.notas_adicionales += ` [CANCELADO EN TRÁNSITO - COORDINAR DEVOLUCIÓN AL: ${comisionista.telefono}]`;
      await envio.save();

      // Actualizamos también la tabla intermedia
      await EnvioXComisionista.findOneAndUpdate(
        { envioId: id },
        { estado_id: 'CANCELADO_RETORNO' }
      );

      // Le mandamos al Front el link listo para usar
      const msj = `Hola ${comisionista.nombre}, necesito cancelar el envío ${envio.nro_envio}. ¿Cómo coordinamos la devolución?`;
      const waLink = `https://wa.me/${comisionista.telefono}?text=${encodeURIComponent(msj)}`;

      return res.status(200).json({
        message: "El envío está en curso. Se ha marcado como CANCELADO_RETORNO. No se reintegra el pago por gastos logísticos.",
        waLink: waLink
      });
    }

    res.status(400).json({ message: "Este envío no se puede cancelar en su estado actual." });
  } catch (error) {
    // Si el micro de usuarios falla, capturamos el error
    if (error.response) {
      return res.status(error.response.status).json({ message: "Error al obtener datos del comisionista" });
    }
    next(error);
  }
};


export const getEnviosPorFecha = async (req, res, next) => {
  try {
    const { comisionistaId } = req.params;
    const { fecha } = req.query; // "YYYY-MM-DD"

    if (!fecha) {
      return res.status(400).json({ message: "La fecha es obligatoria" });
    }

    const inicioDia = new Date(`${fecha}T00:00:00.000Z`);
    const finDia = new Date(`${fecha}T23:59:59.999Z`);

    // ✅ Busca por fecha_entrega (ya no existe fecha_hora_retiro)
    const envios = await Envio.find({
      comisionistaId,
      fecha_entrega: { $gte: inicioDia, $lte: finDia },
      estadoId: { $in: ['ASIGNADO', 'EN_RETIRO', 'EN_CAMINO'] },
    });

    res.status(200).json(envios);
  } catch (error) {
    next(error);
  }
};

export const getEnvioById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const envio = await Envio.findById(id);
    if (!envio) {
      return res.status(404).json({ message: "Envío no encontrado" });
    }
    res.status(200).json(envio);
  } catch (error) {
    next(error);
  }
};



// Agregá esta función para actualizaciones técnicas desde otros micros
export const patchEnvioTecnico = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscamos y actualizamos solo los campos que vengan en el body
    // Esto permite que la IA guarde la polyline sin tocar lo demás
    const envioActualizado = await Envio.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );

    if (!envioActualizado) return res.status(404).json({ message: "Envío no encontrado." });

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
    if (!envio) return res.status(404).json({ message: "Envío no encontrado." });

    if (envio.usuarioId.toString() !== req.userId) {
      return res.status(403).json({ message: "No tienes permiso." });
    }
    if (envio.estadoId !== "PENDIENTE") {
      return res.status(400).json({ message: "Solo podés confirmar comisionista si está PENDIENTE." });
    }

    const bultos = Array.isArray(envio.paquetes) ? envio.paquetes.length : 0;
    if (bultos <= 0) return res.status(400).json({ message: "El envío no tiene paquetes." });

    const VIAJES_BASE = process.env.VIAJES_BASE_URL || "http://localhost:3004";
    const r = await axios.get(`${VIAJES_BASE}/api/search/precio`, {
      params: {
        tripPlanId,
        destinoLocalidadId: envio.destinoCiudad.localidadId,
        destinoLocalidadNombre: envio.destinoCiudad.localidadNombre,
        bultos,
      },
    });

    const { precioPorBulto, total, comisionistaId: comiDelTrip } = r.data;

    if (String(comiDelTrip) !== String(comisionistaId)) {
      return res.status(400).json({ message: "El tripPlanId no corresponde al comisionista indicado." });
    }

    envio.tripPlanId = tripPlanId;
    envio.comisionistaId = comisionistaId;
    envio.costo_estimado = total;
    // ✅ Si el comisionista ya sabe cuándo va a retirar, se guarda; si no, queda null
    if (fecha_retiro) {
      envio.fecha_retiro = new Date(fecha_retiro);
    }
    await envio.save();

    return res.json({ message: "Comisionista confirmado y precio fijado.", envio });
  } catch (err) {
    next(err);
  }
};

// Archivar (ocultar de la lista sin eliminar)
export const archivarEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: "Envío no encontrado." });
    if (envio.usuarioId.toString() !== req.userId) {
      return res.status(403).json({ message: "No tienes permiso." });
    }
    envio.archivado = true;
    await envio.save();
    res.status(200).json({ message: "Envío archivado." });
  } catch (error) { next(error); }
};

// Eliminar lógico (se marca como eliminado, no se borra de la BD)
export const eliminarEnvioLogico = async (req, res, next) => {
  try {
    const { id } = req.params;
    const envio = await Envio.findById(id);
    if (!envio) return res.status(404).json({ message: "Envío no encontrado." });
    if (envio.usuarioId.toString() !== req.userId) {
      return res.status(403).json({ message: "No tienes permiso." });
    }
    envio.eliminado = true;
    await envio.save();
    res.status(200).json({ message: "Envío eliminado." });
  } catch (error) { next(error); }
};