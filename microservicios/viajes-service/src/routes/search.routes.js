// microservicios/viajes-service/src/routes/search.routes.js
import express from "express";
import { z } from "zod";
import TripPlan from "../models/TripPlan.js";
import { dayOfWeekFromISODate } from "../utils/dayOfWeek.js";
import { calcularTotalConDescuento } from "../utils/priceUtils.js";

const router = express.Router();

const norm = (s) => String(s || "").trim().toLowerCase();

router.get("/comisionistas", async (req, res, next) => {
  try {
    const querySchema = z.object({
      fechaEntrega: z.string().min(10), // YYYY-MM-DD
      origenCiudad: z.string().min(1),
      destinoCiudad: z.string().min(1),
      bultos: z.coerce.number().int().min(1).default(1),
    });

    const q = querySchema.parse(req.query);
    const dow = dayOfWeekFromISODate(q.fechaEntrega);

    const origen = norm(q.origenCiudad);
    const destino = norm(q.destinoCiudad);

    // Traigo candidatos por origen + día + activo
    const trips = await TripPlan.find({
      activo: true,
      diasSemana: dow,
      // IMPORTANTE: como guardás strings, si no normalizás en DB,
      // esta comparación exacta te puede fallar por mayúsculas/espacios.
      // Ideal: guardar normalizado o usar regex i.
      origenCiudad: new RegExp(`^${q.origenCiudad.trim()}$`, "i"),
    }).lean();

    // filtro "llega a destino": destino final o parada intermedia
    const candidates = trips.filter((t) => {
      const tDestino = norm(t.destinoCiudad);
      const tParadas = (t.paradas || []).map(norm);
      return tDestino === destino || tParadas.includes(destino);
    });

    const list = candidates
      .map((t) => {
        // precio por localidad (destino o intermedia)
        const precios = Array.isArray(t.preciosPorLocalidad) ? t.preciosPorLocalidad : [];
        const match = precios.find((p) => norm(p.localidad) === destino);
        const precioPorBulto = match?.precio ?? null;

        if (!precioPorBulto || precioPorBulto <= 0) {
          // Si no tiene precio para esa localidad, no sirve para la búsqueda
          return null;
        }

        const { base, final, descuentoAplicado } =
          calcularTotalConDescuento({
            precioPorBulto,
            bultos: q.bultos,
            descuento: t.descuentoPorBultos,
          });

        return {
          comisionistaId: String(t.comisionistaId),
          tripPlanId: String(t._id),
          // luego lo completás llamando a auth-service para nombre/verificado
          nombre: "Comisionista",
          rating: 4.7,
          precioPorBulto,
          bultos: q.bultos,
          precioBase: base,
          descuentoAplicado,
          precioEstimado: final,
          ruta: {
            origenCiudad: t.origenCiudad,
            destinoCiudad: t.destinoCiudad,
            paradas: t.paradas || [],
          },
        };
      })
      .filter(Boolean);

    return res.json({ total: list.length, comisionistas: list });
  } catch (err) {
    next(err);
  }
});

router.get("/precio", async (req, res, next) => {
  try {
    const qs = z.object({
      tripPlanId: z.string().min(1),
      destinoCiudad: z.string().min(1),
      bultos: z.coerce.number().int().min(1),
    });

    const q = qs.parse(req.query);

    const trip = await TripPlan.findById(q.tripPlanId).lean();
    if (!trip || !trip.activo) return res.status(404).json({ error: "TripPlan no encontrado o inactivo" });

    const destino = norm(q.destinoCiudad);

    const precios = Array.isArray(trip.preciosPorLocalidad) ? trip.preciosPorLocalidad : [];
    const match = precios.find((p) => norm(p.localidad) === destino);

    const precioPorBulto = match?.precio ?? null;
    if (!precioPorBulto || precioPorBulto <= 0) {
      return res.status(400).json({ error: "No hay precio para esa localidad" });
    }

    const { base, final, descuentoAplicado } = calcularTotalConDescuento({
  precioPorBulto,
  bultos: q.bultos,
  descuento: trip.descuentoPorBultos,
});

return res.json({
  tripPlanId: String(trip._id),
  comisionistaId: String(trip.comisionistaId),
  destinoCiudad: q.destinoCiudad,
  bultos: q.bultos,
  precioPorBulto,

  // ✅ nuevos
  precioBase: base,
  descuentoAplicado,
  total: final,

  // ✅ opcional (sirve para UI)
  descuentoPorBultos: trip.descuentoPorBultos ?? null,
});
  } catch (err) {
    next(err);
  }
});

export default router;