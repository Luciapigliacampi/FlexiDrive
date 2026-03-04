//microservicios\envio-service\src\routes\envioRoutes.js
import express from 'express';
import { createEnvio, getEnviosDisponibles, aceptarEnvio, actualizarEstadoEnvio, getHistorial, updateEnvio, cancelarEnvio, getEnviosPorFecha, getEnvioById, patchEnvioTecnico, confirmarComisionista, archivarEnvio, eliminarEnvioLogico} from '../controllers/envioControllers.js';
import { authMiddleware, isCliente, isComisionista} from '../middlewares/authMiddlewares.js'; // El que vas a copiar
import {
  getDashboardResumen,
  getAgendaHoy,
} from '../controllers/dashboardControllers.js';

const router = express.Router();

// Solo usuarios logueados pueden crear envíos
router.post('/', authMiddleware, isCliente, createEnvio);

// Marta (comisionista) consulta qué hay para llevar
router.get('/disponibles', authMiddleware, isComisionista, getEnviosDisponibles);

router.patch('/aceptar', authMiddleware, isComisionista, aceptarEnvio);

router.patch('/actualizar-estado', authMiddleware, isComisionista, actualizarEstadoEnvio);

// Historial de viajes para Clientes y Comisionistas
router.get('/historial', authMiddleware, getHistorial);

router.patch('/:id/archivar', authMiddleware, isCliente, archivarEnvio);
router.patch('/:id/eliminar', authMiddleware, isCliente, eliminarEnvioLogico);


// MODIFICAR ENVÍO (Ana quiere cambiar la dirección o nota antes de que Marta lo acepte)
router.put('/:id', authMiddleware, isCliente, updateEnvio);

// CANCELAR ENVÍO (Ana se arrepiente)
router.delete('/:id', authMiddleware, isCliente, cancelarEnvio);

// Nuevo endpoint para que la IA consulte la agenda de un comisionista
router.get('/agenda/:comisionistaId', authMiddleware, isComisionista, getEnviosPorFecha);

router.get('/comisionista/dashboard/resumen', authMiddleware, isComisionista, getDashboardResumen);
router.get('/comisionista/dashboard/agenda',  authMiddleware, isComisionista, getAgendaHoy);

// Agregar esta línea: envio especifico 
router.get('/:id', authMiddleware, getEnvioById); 

// En tu archivo de rutas de envíos
router.patch('/:id', authMiddleware, patchEnvioTecnico);

router.patch("/:id/confirmar-comisionista", authMiddleware, isCliente, confirmarComisionista);
export default router;