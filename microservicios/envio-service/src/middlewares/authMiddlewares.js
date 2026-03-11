//microservicios\envio-service\src\middlewares\authMiddlewares.js
import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "No se proporcionó un token de seguridad" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; 
    req.userRol = decoded.rol || decoded.role || null;
    next(); 
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

export const isCliente = (req, res, next) => {
  if (req.userRol !== 'cliente') {
    return res.status(403).json({ 
      message: "Acceso denegado. Solo los clientes pueden solicitar envíos." 
    });
  }
  next();
};

export const isComisionista = (req, res, next) => {
  if (req.userRol !== 'comisionista') {
    return res.status(403).json({ 
      message: "Acceso denegado. Solo los comisionistas pueden ver envíos disponibles." 
    });
  }
  next();
};

// ── Uso interno entre microservicios ──────────────────────────────────────
// Reemplaza authMiddleware + isComisionista/isCliente para llamadas
// server-to-server donde no hay JWT de usuario (ej: getSeguimientoEnvio).
// Requiere el header: x-internal-key: <INTERNAL_API_KEY del .env>
export const isInternal = (req, res, next) => {
  const apiKey = req.headers['x-internal-key'];
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ message: 'Acceso interno denegado.' });
  }
  next();
};