//microservicios/viajes-service/src/middleware/auth.js
import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) return res.status(401).json({ error: "Token requerido" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // FIX: el auth-service puede generar el token con distintos nombres para el id.
    // Normalizamos a req.user.id sin importar cuál use.
    // Orden de precedencia: id > _id > userId > sub (estándar JWT)
    req.user = {
      ...payload,
      id: payload.id ?? payload._id ?? payload.userId ?? payload.sub ?? undefined,
    };

    if (!req.user.id) {
      console.error("⚠️  JWT válido pero sin campo de id reconocible:", Object.keys(payload));
      return res.status(401).json({ error: "Token sin identificador de usuario" });
    }

    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}
