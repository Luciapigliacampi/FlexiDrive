//microservicios/notificaciones-service/src/controllers/notificacionControllers.js
import Notificacion from '../models/notificacionModel.js';
import { pushNotificacion } from '../utils/wsManager.js';

// POST /api/notificaciones  (interno)
export const crearNotificacion = async (req, res, next) => {
  try {
    const { userId, rol, tipo, titulo, contenido, envioId } = req.body;

    if (!userId || !rol || !tipo || !titulo || !contenido)
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });

    const notif = await Notificacion.create({ userId, rol, tipo, titulo, contenido, envioId: envioId || null });

    // Push en tiempo real si el usuario está conectado
    pushNotificacion(userId, notif);

    return res.status(201).json(notif);
  } catch (err) {
    next(err);
  }
};

// GET /api/notificaciones  (usuario autenticado)
export const getNotificaciones = async (req, res, next) => {
  try {
    const notifs = await Notificacion.find({ userId: req.userId, visible: { $ne: false } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json(notifs);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notificaciones/:id/leer
export const marcarLeida = async (req, res, next) => {
  try {
    const notif = await Notificacion.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { leida: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notificación no encontrada.' });
    return res.status(200).json(notif);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notificaciones/leer-todas
export const marcarTodasLeidas = async (req, res, next) => {
  try {
    await Notificacion.updateMany({ userId: req.userId, leida: false }, { leida: true });
    return res.status(200).json({ message: 'Todas marcadas como leídas.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/notificaciones/no-leidas-count
export const contarNoLeidas = async (req, res, next) => {
  try {
    const count = await Notificacion.countDocuments({ userId: req.userId, leida: false, visible: { $ne: false } });
    return res.status(200).json({ count });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notificaciones/:id/ocultar  — borrado lógico individual
export const ocultarNotificacion = async (req, res, next) => {
  try {
    const notif = await Notificacion.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { visible: false },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notificación no encontrada.' });
    return res.status(200).json(notif);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notificaciones/ocultar-todas  — borrado lógico masivo
export const ocultarTodasNotificaciones = async (req, res, next) => {
  try {
    await Notificacion.updateMany({ userId: req.userId, visible: { $ne: false } }, { visible: false });
    return res.status(200).json({ message: 'Todas las notificaciones ocultadas.' });
  } catch (err) {
    next(err);
  }
};
