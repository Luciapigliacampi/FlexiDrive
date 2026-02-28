//microservicios\viajes-service\src\middleware\errorHandler.js
export function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Error de validación",
      detalles: err.errors.map((e) => ({
        campo: e.path.join("."),
        mensaje: e.message
      }))
    });
  }

  return res.status(500).json({ error: "Error interno" });
}