//microservicios\auth-service\src\middlewares\authMiddleware.js
import jwt from 'jsonwebtoken';
import Usuario from '../models/userModel.js';
import UsuarioRol from '../models/userRoleModel.js'; // Asegurate de importar el modelo de la relación

export const authMiddleware = (req, res, next) => {
  // 1. Buscamos el token en el header Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // El formato es "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "No se proporcionó un token de seguridad" });
  }

  try {
    // 2. Verificamos que el token sea nuestro y esté vigente
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.step) throw new Error("Token temporal (2FA pendiente): no sirve como sesión");
    
    // 3. ¡ESTO ES CLAVE! Metemos el userId dentro del objeto 'req'
    // Así, cuando llegue a tu controlador 'updateProfile', el ID ya estará ahí.
    req.userId = decoded.userId; 
    
    next(); // Seguimos al controlador
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

export const isAdmin = async (req, res, next) => {
  try {
    // BUSCAMOS EN LA TABLA INTERMEDIA
    const relacion = await UsuarioRol.findOne({ 
      usuarioId: req.userId, 
      rolId: 'admin' // Como tu ID es el string 'admin', buscamos así
    });


    if (!relacion) {
      return res.status(403).json({ 
        message: "Acceso denegado. Se requieren permisos de administrador." 
      });
    }

    next(); // Si existe la relación con 'admin', pasa
  } catch (error) {
    next(error);
  }
};

// ── Uso interno entre microservicios ──────────────────────────────────────
// Requiere el header: x-internal-key: <INTERNAL_API_KEY del .env>
export const isInternal = (req, res, next) => {
  const apiKey = req.headers['x-internal-key'];
  if (!apiKey || !process.env.INTERNAL_API_KEY || apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ message: 'Acceso interno denegado.' });
  }
  next();
};
