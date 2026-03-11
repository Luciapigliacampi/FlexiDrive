import { Router } from 'express';
import {
  crearNotificacion,
  getNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  contarNoLeidas,
} from '../controllers/notificacionControllers.js';
import { authMiddleware, isInternal } from '../middlewares/authMiddlewares.js';

const router = Router();

// Internas (desde otros microservicios)
router.post('/', isInternal, crearNotificacion);

// Autenticadas (frontend)
router.get('/',                  authMiddleware, getNotificaciones);
router.get('/no-leidas-count',   authMiddleware, contarNoLeidas);
router.patch('/leer-todas',      authMiddleware, marcarTodasLeidas);
router.patch('/:id/leer',        authMiddleware, marcarLeida);

export default router;
