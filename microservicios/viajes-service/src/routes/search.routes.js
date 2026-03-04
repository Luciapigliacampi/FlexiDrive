// microservicios/viajes-service/src/routes/search.routes.js
import express from "express";
import { z } from "zod";
import TripPlan from "../models/TripPlan.js";
import { dayOfWeekFromISODate } from "../utils/dayOfWeek.js";
import { calcularTotalConDescuento } from "../utils/priceUtils.js";
import axios from "axios";

const AUTH_BASE = process.env.AUTH_SERVICE_URL || "http://localhost:3000";

const router = express.Router();

const norm = (s) => String(s || "").trim().toLowerCase();



// GET /api/search/comisionistas
// Busca tripPlans activos que:
//   - salgan desde origenLocalidadId (o coincidan por nombre, case-insensitive)
//   - lleguen a destinoLocalidadId (destino o intermedia)
//   - operen el día de fechaEntrega
//   - tengan precio cargado para el destino
router.get("/comisionistas", async (req, res, next) => {
  try {
    const querySchema = z.object({
      fechaEntrega: z.string().min(10),          // YYYY-MM-DD
      // FIX: el modelo guarda localidadId + localidadNombre, no origenCiudad
      // Aceptamos búsqueda por id O por nombre (para compatibilidad)
      origenLocalidadId: z.string().optional(),
      origenLocalidadNombre: z.string().optional(),
      destinoLocalidadId: z.string().optional(),
      destinoLocalidadNombre: z.string().optional(),
      bultos: z.coerce.number().int().min(1).default(1),
    }).refine(
      (d) => d.origenLocalidadId || d.origenLocalidadNombre,
      { message: "Se requiere origenLocalidadId o origenLocalidadNombre" }
    ).refine(
      (d) => d.destinoLocalidadId || d.destinoLocalidadNombre,
      { message: "Se requiere destinoLocalidadId o destinoLocalidadNombre" }
    );

    const q = querySchema.parse(req.query);
    const dow = dayOfWeekFromISODate(q.fechaEntrega);

    // ─── Filtro Mongo: origen + día + activo ───────────────────────────────
    const mongoFilter = {
      activo: true,
      diasSemana: dow,
    };

    // Preferimos buscar por ID (exacto), con fallback a nombre (regex)
    if (q.origenLocalidadId) {
      mongoFilter["origen.localidadId"] = q.origenLocalidadId;
    } else {
      mongoFilter["origen.localidadNombre"] = new RegExp(
        `^${q.origenLocalidadNombre.trim()}$`, "i"
      );
    }

    const trips = await TripPlan.find(mongoFilter).lean();

    // ─── Filtro en memoria: llega al destino ──────────────────────────────
    const destinoId = q.destinoLocalidadId || null;
    const destinoNorm = q.destinoLocalidadNombre ? norm(q.destinoLocalidadNombre) : null;

    function llegaADestino(t) {
      // destino final
      if (destinoId && t.destino?.localidadId === destinoId) return true;
      if (destinoNorm && norm(t.destino?.localidadNombre) === destinoNorm) return true;

      // paradas intermedias
      for (const it of t.intermedias || []) {
        if (destinoId && it.localidadId === destinoId) return true;
        if (destinoNorm && norm(it.localidadNombre) === destinoNorm) return true;
      }
      return false;
    }

    // ─── Armar respuesta ──────────────────────────────────────────────────
    const filtered = trips.filter(llegaADestino).map((t) => {
      const precios = Array.isArray(t.preciosPorLocalidad) ? t.preciosPorLocalidad : [];
      const match = precios.find((p) =>
        (destinoId && p.localidadId === destinoId) ||
        (destinoNorm && norm(p.localidadNombre) === destinoNorm)
      );
      const precioPorBulto = match?.precio ?? null;
      if (!precioPorBulto || precioPorBulto <= 0) return null;

      const { base, final, descuentoAplicado } = calcularTotalConDescuento({
        precioPorBulto,
        bultos: q.bultos,
        descuento: t.descuentoPorBultos,
      });

      return { t, precioPorBulto, base, final, descuentoAplicado };
    }).filter(Boolean);

    // ✅ Traer nombres del auth-service en paralelo
    const comisionistaIds = [...new Set(filtered.map((f) => String(f.t.comisionistaId)))];

    const nombresMap = {};
    await Promise.all(
      comisionistaIds.map(async (id) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/${id}`, {
            headers: { Authorization: req.headers.authorization },
          });
          // ✅ ajustá el campo según lo que devuelva getUserPublicInfo
          nombresMap[id] = data.nombre && data.apellido
            ? `${data.nombre} ${data.apellido}`
            : data.nombre || "Comisionista";
        } catch {
          nombresMap[id] = "Comisionista";
        }
      })
    );

    const list = filtered.map(({ t, precioPorBulto, base, final, descuentoAplicado }) => ({
      comisionistaId: String(t.comisionistaId),
      tripPlanId: String(t._id),
      nombre: nombresMap[String(t.comisionistaId)] || "Comisionista", // ✅
      rating: 4.7,
      precioPorBulto,
      bultos: q.bultos,
      precioBase: base,
      descuentoAplicado,
      precioEstimado: final,
      ruta: {
        origen: t.origen,
        destino: t.destino,
        intermedias: t.intermedias || [],
      },
    }));

    return res.json({ total: list.length, comisionistas: list });
  } catch (err) {
    next(err);
  }
});

// GET /api/search/precio
router.get("/precio", async (req, res, next) => {
  try {
    const qs = z.object({
      tripPlanId: z.string().min(1),
      // FIX: igual que arriba, por id o por nombre
      destinoLocalidadId: z.string().optional(),
      destinoLocalidadNombre: z.string().optional(),
      bultos: z.coerce.number().int().min(1),
    }).refine(
      (d) => d.destinoLocalidadId || d.destinoLocalidadNombre,
      { message: "Se requiere destinoLocalidadId o destinoLocalidadNombre" }
    );

    const q = qs.parse(req.query);

    const trip = await TripPlan.findById(q.tripPlanId).lean();
    if (!trip || !trip.activo) {
      return res.status(404).json({ error: "TripPlan no encontrado o inactivo" });
    }

    const destinoId = q.destinoLocalidadId || null;
    const destinoNorm = q.destinoLocalidadNombre ? norm(q.destinoLocalidadNombre) : null;

    const precios = Array.isArray(trip.preciosPorLocalidad) ? trip.preciosPorLocalidad : [];

    const match = precios.find((p) =>
      (destinoId && p.localidadId === destinoId) ||
      (destinoNorm && norm(p.localidadNombre) === destinoNorm)
    );

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
      destino: match ? { localidadId: match.localidadId, localidadNombre: match.localidadNombre } : null,
      bultos: q.bultos,
      precioPorBulto,
      precioBase: base,
      descuentoAplicado,
      total: final,
      descuentoPorBultos: trip.descuentoPorBultos ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
