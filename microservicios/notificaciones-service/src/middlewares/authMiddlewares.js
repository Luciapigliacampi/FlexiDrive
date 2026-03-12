//microservicios\notificaciones-service\src\middlewares\authMiddlewares.js
import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Token requerido.' });

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.userId = String(decoded.userId || decoded.id || decoded._id);
    req.userRol = decoded.rol;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido.' });
  }
};

export const isInternal = (req, res, next) => {
  if (req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY)
    return res.status(403).json({ message: 'Acceso denegado.' });
  next();
};
