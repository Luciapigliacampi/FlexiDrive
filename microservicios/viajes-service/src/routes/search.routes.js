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
//   - pasen por origenLocalidad (origen O intermedia del TripPlan)
//   - lleguen a destinoLocalidad (destino O intermedia del TripPlan)
//   - el origen del envío aparezca ANTES del destino en la ruta
//   - operen el día de fechaEntrega
//   - tengan precio cargado para el destino
router.get("/comisionistas", async (req, res, next) => {
  try {
    const querySchema = z.object({
      fechaEntrega: z.string().min(10),
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

    // ─── Solo filtramos por día y activo en Mongo.
    //     El filtro de origen/destino lo hacemos en memoria para soportar intermedias.
    const trips = await TripPlan.find({ activo: true, diasSemana: dow }).lean();

    const origenId   = q.origenLocalidadId   || null;
    const origenNorm = q.origenLocalidadNombre ? norm(q.origenLocalidadNombre) : null;
    const destinoId   = q.destinoLocalidadId   || null;
    const destinoNorm = q.destinoLocalidadNombre ? norm(q.destinoLocalidadNombre) : null;

    // Verifica si una localidad está en algún punto de la ruta (origen, intermedias o destino)
    function estaEnRuta(t, localidadId, localidadNombre) {
      const paradas = [t.origen, ...(t.intermedias || []), t.destino];
      return paradas.some((p) => {
        if (localidadId && p?.localidadId === localidadId) return true;
        if (localidadNombre && norm(p?.localidadNombre) === localidadNombre) return true;
        return false;
      });
    }

    const filtered = trips.map((t) => {
      // Debe pasar por ambas localidades (ruta circular: puede retirar en Oliva
      // y entregar en Villa María aunque Villa María sea el origen del viaje)
      if (!estaEnRuta(t, origenId, origenNorm))  return null;
      if (!estaEnRuta(t, destinoId, destinoNorm)) return null;

      // Buscar precio para el tramo del envío.
      // Orden de prioridad:
      //   1. Precio cargado para la localidad DESTINO del envío
      //   2. Precio cargado para la localidad ORIGEN del envío (tramo equivalente inverso)
      //      Cubre casos como: intermedia→origen, intermedia→intermedia, origen→intermedia
      const precios = Array.isArray(t.preciosPorLocalidad) ? t.preciosPorLocalidad : [];

      const matchDestino = precios.find((p) =>
        (destinoId && p.localidadId === destinoId) ||
        (destinoNorm && norm(p.localidadNombre) === destinoNorm)
      );

      const matchOrigen = precios.find((p) =>
        (origenId && p.localidadId === origenId) ||
        (origenNorm && norm(p.localidadNombre) === origenNorm)
      );

      const match = matchDestino || matchOrigen;
      const precioPorBulto = match?.precio ?? null;
      if (!precioPorBulto || precioPorBulto <= 0) return null;

      const { base, final, descuentoAplicado } = calcularTotalConDescuento({
        precioPorBulto,
        bultos: q.bultos,
        descuento: t.descuentoPorBultos,
      });

      return { t, precioPorBulto, base, final, descuentoAplicado };
    }).filter(Boolean);

    // ─── Traer nombres del auth-service en paralelo ───────────────────────
    const comisionistaIds = [...new Set(filtered.map((f) => String(f.t.comisionistaId)))];
    const nombresMap = {};
    await Promise.all(
      comisionistaIds.map(async (id) => {
        try {
          const { data } = await axios.get(`${AUTH_BASE}/api/auth/${id}`, {
            headers: { Authorization: req.headers.authorization },
          });
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
      nombre: nombresMap[String(t.comisionistaId)] || "Comisionista",
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
      destinoLocalidadId:    z.string().optional(),
      destinoLocalidadNombre: z.string().optional(),
      origenLocalidadId:     z.string().optional(),
      origenLocalidadNombre:  z.string().optional(),
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

    const destinoId   = q.destinoLocalidadId   || null;
    const destinoNorm = q.destinoLocalidadNombre ? norm(q.destinoLocalidadNombre) : null;
    const origenId    = q.origenLocalidadId    || null;
    const origenNorm  = q.origenLocalidadNombre  ? norm(q.origenLocalidadNombre)  : null;
    const precios = Array.isArray(trip.preciosPorLocalidad) ? trip.preciosPorLocalidad : [];

    // Mismo fallback que en /comisionistas:
    //   1. Precio para el destino del envío
    //   2. Precio para el origen del envío (tramo equivalente inverso)
    const matchDestino = precios.find((p) =>
      (destinoId && p.localidadId === destinoId) ||
      (destinoNorm && norm(p.localidadNombre) === destinoNorm)
    );
    const matchOrigen = (origenId || origenNorm)
      ? precios.find((p) =>
          (origenId && p.localidadId === origenId) ||
          (origenNorm && norm(p.localidadNombre) === origenNorm)
        )
      : null;
    const match = matchDestino || matchOrigen;

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