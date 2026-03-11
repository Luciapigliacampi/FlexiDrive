// microservicios/ia-route-service/src/routes/routeRoutes.js
import { Router } from 'express';
import {
  getAddressSuggestions,
  getPlaceDetails,
  getRutaActiva,
  generarRutaParaComisionista,
  confirmarFechaRetiro,
  completarParada,
  getSeguimientoEnvio, desactivarRuta, marcarViajeIniciado
} from '../controllers/routeControllers.js';
import { authMiddleware, isComisionista } from '../middlewares/authMiddlewares.js';

const router = Router();

// Maps
router.get('/autocomplete', authMiddleware, getAddressSuggestions);
router.get('/details',      authMiddleware, getPlaceDetails);

// Ruta optimizada
router.get('/activa/:comisionistaId',  authMiddleware, isComisionista, getRutaActiva);
router.get('/generar/:comisionistaId', authMiddleware, isComisionista, generarRutaParaComisionista);
router.patch('/desactivar/:comisionistaId', authMiddleware, isComisionista, desactivarRuta);
router.patch('/iniciar/:comisionistaId', authMiddleware, isComisionista, marcarViajeIniciado);

// Acciones sobre paradas
router.patch('/parada/:envioId/confirmar-retiro', authMiddleware, isComisionista, confirmarFechaRetiro);
router.patch('/parada/:envioId/completar',        authMiddleware, isComisionista, completarParada);

// Cliente: seguimiento público
router.get('/seguimiento/:envioId', getSeguimientoEnvio);

export default router;
