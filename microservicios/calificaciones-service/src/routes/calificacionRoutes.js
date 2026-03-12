//microservicios\calificaciones-service\src\routes\calificacionRoutes.js
import { Router } from 'express';
import { crearCalificacion, getReputacionComisionista, getCalificacionPorEnvio, actualizarCalificacion } from '../controllers/calificacionesControllers.js';
import { authMiddleware, isCliente } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', authMiddleware, isCliente, crearCalificacion);

// ✅ Rutas específicas ANTES que la genérica /:id
router.get('/envio/:envioId', getCalificacionPorEnvio);
router.put('/envio/:envioId', authMiddleware, isCliente, actualizarCalificacion);

// ✅ Ruta genérica AL FINAL
router.get('/:id', getReputacionComisionista);

export default router;