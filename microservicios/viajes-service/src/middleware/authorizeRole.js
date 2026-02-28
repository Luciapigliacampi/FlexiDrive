//microservicios\viajes-service\src\middleware\authorizeRole.js
export function authorizeRole(...roles) {
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol || !roles.includes(rol)) {
      return res.status(403).json({ error: "No autorizado" });
    }
    next();
  };
}