import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "No se proporcionó un token de seguridad" });
  }

  try {
    // Verificamos con la JWT_SECRET que definas en el .env de este micro
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Extraemos el ID y lo pasamos al req para que el controlador lo use
    req.userId = decoded.userId; 
    req.userRol = decoded.rol; // <--- ESTA ES LA LÍNEA QUE TE FALTA
    
    next(); 
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

export const isCliente = (req, res, next) => {
    // El authMiddleware ya decodificó el token y puso los datos en req
    // Si al generar el token incluiste el rol, lo verificamos así:
    if (req.userRol !== 'cliente') {
        return res.status(403).json({ 
            message: "Acceso denegado. Solo los clientes pueden solicitar envíos." 
        });
    }
    next();
};

export const isComisionista = (req, res, next) => {
    // El authMiddleware ya cargó req.userRol desde el token
    if (req.userRol !== 'comisionista') {
        return res.status(403).json({ 
            message: "Acceso denegado. Solo los comisionistas pueden ver envíos disponibles." 
        });
    }
    next();
};