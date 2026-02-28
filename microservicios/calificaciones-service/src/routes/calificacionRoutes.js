import { Router } from 'express';
import { crearCalificacion, getReputacionComisionista } from '../controllers/calificacionesControllers.js';
import { authMiddleware, isCliente } from '../middlewares/authMiddleware.js';

const router = Router();

// Ana (Cliente) califica a Marta
router.post('/', authMiddleware, isCliente, crearCalificacion);

// Ver la reputación de un comisionista (Público)
router.get('/:id', getReputacionComisionista);

export default router;