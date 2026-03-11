// microservicios/envio-service/src/routes/envioRoutes.js
import express from 'express';

import {
  createEnvio,
  getEnviosDisponibles,
  aceptarEnvio,
  actualizarEstadoEnvio,
  getHistorial,
  updateEnvio,
  cancelarEnvio,
  getEnviosPorFecha,
  getEnvioById,
  patchEnvioTecnico,
  confirmarComisionista,
  archivarEnvio,
  eliminarEnvioLogico,
  getEnviosParaRuta,
  marcarRetirado,
  marcarEntregado,
  iniciarViaje,
  cancelarPorComisionista,
} from '../controllers/envioControllers.js';

import {
  getDashboardResumen,
  getAgendaHoy,
  finalizarViaje,
} from '../controllers/dashboardControllers.js';

import { authMiddleware, isCliente, isComisionista, isInternal } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// ── Crear envío (cliente) ──────────────────────────────────────────────────
router.post('/', authMiddleware, isCliente, createEnvio);

// ── Envíos disponibles para comisionista ──────────────────────────────────
router.get('/disponibles', authMiddleware, isComisionista, getEnviosDisponibles);

// ── Aceptar envío ──────────────────────────────────────────────────────────
router.patch('/aceptar', authMiddleware, isComisionista, aceptarEnvio);

// ── Actualizar estado (genérico/admin) ─────────────────────────────────────
router.patch('/actualizar-estado', authMiddleware, isComisionista, actualizarEstadoEnvio);

// ── Historial ──────────────────────────────────────────────────────────────
router.get('/historial', authMiddleware, getHistorial);

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/comisionista/dashboard/resumen', authMiddleware, isComisionista, getDashboardResumen);
router.get('/comisionista/dashboard/agenda',  authMiddleware, isComisionista, getAgendaHoy);
router.post('/comisionista/dashboard/iniciar-viaje',   authMiddleware, isComisionista, iniciarViaje);
router.post('/comisionista/dashboard/finalizar-viaje', authMiddleware, isComisionista, finalizarViaje);

// ── Ruta optimizada ────────────────────────────────────────────────────────
router.get('/comisionista/:comisionistaId/ruta', authMiddleware, isComisionista, getEnviosParaRuta);

// ── Agenda por fecha (legacy) ──────────────────────────────────────────────
router.get('/agenda/:comisionistaId', authMiddleware, isComisionista, getEnviosPorFecha);

// ── Acciones de estado específicas (ANTES de /:id para no ser interceptadas)
router.patch('/:id/marcar-retirado',          authMiddleware, isComisionista, marcarRetirado);
router.patch('/:id/marcar-entregado',         authMiddleware, isComisionista, marcarEntregado);
router.patch('/:id/cancelar-comisionista',    authMiddleware, isComisionista, cancelarPorComisionista);
router.patch('/:id/archivar',                 authMiddleware, isCliente,      archivarEnvio);
router.patch('/:id/eliminar',                 authMiddleware, isCliente,      eliminarEnvioLogico);
router.patch('/:id/confirmar-comisionista',   authMiddleware, isCliente,      confirmarComisionista);

// ── Ruta interna para microservicios ──────────────────────────────────────
// Usada por ia-route-service/getSeguimientoEnvio (ruta pública que no tiene JWT).
// Protegida por isInternal (x-internal-key), mismo patrón que isCliente/isComisionista.
router.get('/interno/:id', isInternal, getEnvioById);

// ── CRUD genérico (al final para no interceptar rutas específicas) ─────────
router.get('/:id',    authMiddleware, getEnvioById);
router.put('/:id',    authMiddleware, isCliente, updateEnvio);
router.delete('/:id', authMiddleware, isCliente, cancelarEnvio);
router.patch('/:id',  authMiddleware, patchEnvioTecnico);

export default router;