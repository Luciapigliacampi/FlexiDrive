import { Router } from 'express';
import { getAddressSuggestions, getPlaceDetails, getRutaActiva, generarRutaParaComisionista, getSeguimientoEnvio} from '../controllers/routeControllers.js'; // 1. Agregá el import aquí
import { authMiddleware, isComisionista } from '../middlewares/authMiddlewares.js';

const router = Router();

// Endpoint para el buscador (sugerencias de texto)
router.get('/autocomplete', authMiddleware, getAddressSuggestions);

// 2. Nuevo endpoint para obtener coordenadas una vez elegida la dirección
router.get('/details', authMiddleware, getPlaceDetails); 

router.get('/activa/:comisionistaId', authMiddleware, isComisionista, getRutaActiva);

// Este crea la ruta usando la IA de Google y la guarda en la DB
router.get('/generar/:comisionistaId', authMiddleware, isComisionista, generarRutaParaComisionista);

//cliente
router.get('/seguimiento/:envioId', getSeguimientoEnvio);

export default router;