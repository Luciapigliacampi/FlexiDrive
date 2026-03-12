//microservicios\auth-service\src\routes\authRoutes.js
import { Router } from 'express';
import { register, login, verifyTotp, enableTotp, confirmTotp, resetTotp, googleLogin, updateProfile, updateComisionistaData, updateComisionistaDataTemp, approveComisionista, getMyFullProfile, updateFullProfile, disableAccount, adminDisableUser, registerVehiculo, getMyVehicles, approveVehiculo, getComisionistasHabilitados, getUserPublicInfo, getMyStatus, getPublicComisionistaProfile, updateReputacionComisionista, getMisDirecciones, addMiDireccion, deleteMiDireccion,
  getMisDestinatarios, addMiDestinatario, deleteMiDestinatario, updateVehiculo, deleteVehiculo, getDestinatarioById } from '../controllers/authControllers.js';
import { authMiddleware, isAdmin } from '../middlewares/authMiddleware.js'; // <-- Importalo acá
import { upload } from '../middlewares/uploadMiddleware.js'; // <-- 1. Importá el middleware de subida
const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-totp', verifyTotp);

// Nuevas rutas para gestión de 2FA
router.post('/enable-totp', enableTotp);
router.post('/confirm-totp', confirmTotp);
router.post('/reset-totp', resetTotp); // <--- Botón "Perdí mi TOTP"

router.post('/google', googleLogin);
router.put('/update-profile', updateProfile); // Protegida con token

router.put("/complete-comisionista-temp", upload.fields([
  { name: "dniFrente", maxCount: 1 },
  { name: "dniDorso", maxCount: 1 }
]), updateComisionistaDataTemp);

router.put('/complete-comisionista', authMiddleware, 
    upload.fields([
    { name: 'dniFrente', maxCount: 1 },
    { name: 'dniDorso', maxCount: 1 }
  ]), updateComisionistaData);


  // Ruta para que el admin apruebe (después de mirar las fotos)
router.patch('/approve-comisionista', authMiddleware, isAdmin, approveComisionista);

//rutas crud usuarios 
// Rutas de Perfil
router.get('/me', authMiddleware, getMyFullProfile);
router.put('/update', authMiddleware, updateFullProfile);
router.patch('/disable', authMiddleware, disableAccount);
router.patch('/admin/disable-user', authMiddleware, isAdmin, adminDisableUser);

// Registro de vehículo para comisionistas
router.post('/register-vehiculo', authMiddleware, registerVehiculo);
router.put('/vehicles/:id',    authMiddleware, updateVehiculo);
router.delete('/vehicles/:id', authMiddleware, deleteVehiculo);

// Listado de vehículos propios
router.get('/my-vehicles', authMiddleware, getMyVehicles);

// Aprobación de vehículos (Solo Admin)
router.patch('/approve-vehiculo', authMiddleware, isAdmin, approveVehiculo);
// Ruta para listar comisionistas que pasaron todas las verificaciones
router.get('/comisionistas/habilitados', getComisionistasHabilitados);

//saber q le falta al usuario
router.get('/status', authMiddleware, getMyStatus);

//Perfil público para el seguimiento (Público - para el cliente)
router.get('/public-profile/:id', getPublicComisionistaProfile);

// Actualizar reputación (Llamado desde el Micro de Calificaciones)
router.patch('/update-reputacion/:id', authMiddleware, updateReputacionComisionista);

// ===============================
// Direcciones frecuentes (ORIGEN)
// ===============================
router.get("/direcciones", authMiddleware, getMisDirecciones);
router.post("/direcciones", authMiddleware, addMiDireccion);
router.delete("/direcciones/:id", authMiddleware, deleteMiDireccion);

// ===============================
// Destinatarios (DESTINO)
// ===============================
router.get("/destinatarios", authMiddleware, getMisDestinatarios);
router.post("/destinatarios", authMiddleware, addMiDestinatario);
router.delete("/destinatarios/:id", authMiddleware, deleteMiDestinatario);
router.get("/destinatarios/:id", authMiddleware, getDestinatarioById);

//obtener datos para micro envio
router.get('/:id', authMiddleware, getUserPublicInfo);

export default router;
