// src/middlewares/errorMiddlewares.js


export const errorHandler = (err, req, res, next) => {
  // 1. Log del error para el desarrollador (vos)
  console.error("❌ Error capturado:", err);

  // 2. Si es un error de validación de Zod
  if (err.name === "ZodError" || err.issues) {
    // Zod a veces pone los errores en 'issues' o directamente en el array
    const detalles = (err.issues || err.errors || []).map(e => ({
      campo: e.path.join('.'),
      mensaje: e.message
    }));

    return res.status(400).json({
      error: "Error de validación",
      detalles: detalles.length > 0 ? detalles : err.message
    });
  }

  // 3. Error de MongoDB (ej: ID mal formado)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'ID con formato inválido' });
  }

  // 4. Errores generales (los que lanzas con throw new Error)
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    error: err.message || "Error interno del servidor"
  });
};
