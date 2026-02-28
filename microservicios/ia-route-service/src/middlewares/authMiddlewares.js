import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "No se proporcionó un token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; 
    req.userRol = decoded.rol; 
    next(); 
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

export const isComisionista = (req, res, next) => {
    if (req.userRol !== 'comisionista') {
        return res.status(403).json({ message: "Acceso denegado. Solo para comisionistas." });
    }
    next();
};