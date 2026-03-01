import express from "express";
import { z } from "zod";
import TripPlan from "../models/TripPlan.js";
import { auth } from "../middleware/auth.js";
import { authorizeRole } from "../middleware/authorizeRole.js";

const router = express.Router();

const PlaceSchema = z.object({
  provinciaId: z.string().min(1),
  provinciaNombre: z.string().optional().default(""),
  localidadId: z.string().min(1),
  localidadNombre: z.string().optional().default(""),
});

const PrecioPorLocalidadSchema = z.object({
  localidadId: z.string().min(1),
  localidadNombre: z.string().optional().default(""),
  precio: z.coerce.number().min(0),
});

const TripPlanSchema = z.object({
  vehiculoId: z.string().min(1),

  origen: PlaceSchema,
  destino: PlaceSchema,
  intermedias: z.array(PlaceSchema).optional().default([]),

  diasSemana: z.array(z.number().int().min(0).max(6)).min(1),
  activo: z.boolean().optional().default(true),

  preciosPorLocalidad: z.array(PrecioPorLocalidadSchema).optional().default([]),

  descuentoPorBultos: z
    .object({
      minBultos: z.coerce.number().int().min(0).default(0),
      tipo: z.enum(["porcentaje", "monto"]).default("porcentaje"),
      valor: z.coerce.number().min(0).default(0),
    })
    .optional()
    .default({ minBultos: 0, tipo: "porcentaje", valor: 0 }),
});

// Crear
router.post("/", auth, authorizeRole("comisionista"), async (req, res, next) => {
  try {
    const data = TripPlanSchema.parse(req.body);

    const doc = await TripPlan.create({
      comisionistaId: req.user.id,
      ...data,
    });

    return res.status(201).json({ message: "Viaje creado", tripPlan: doc });
  } catch (err) {
    next(err);
  }
});

// Mis viajes
router.get("/mine", auth, authorizeRole("comisionista"), async (req, res, next) => {
  try {
    const list = await TripPlan.find({ comisionistaId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ total: list.length, tripPlans: list });
  } catch (err) {
    next(err);
  }
});

// Editar
router.put("/:id", auth, authorizeRole("comisionista"), async (req, res, next) => {
  try {
    const data = TripPlanSchema.partial().parse(req.body);

    const updated = await TripPlan.findOneAndUpdate(
      { _id: req.params.id, comisionistaId: req.user.id },
      { $set: data },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Viaje no encontrado" });
    return res.json({ message: "Viaje actualizado", tripPlan: updated });
  } catch (err) {
    next(err);
  }
});

// Activar/desactivar
router.patch("/:id/activo", auth, authorizeRole("comisionista"), async (req, res, next) => {
  try {
    const { activo } = z.object({ activo: z.boolean() }).parse(req.body);

    const updated = await TripPlan.findOneAndUpdate(
      { _id: req.params.id, comisionistaId: req.user.id },
      { $set: { activo } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Viaje no encontrado" });
    return res.json({ message: "Estado actualizado", tripPlan: updated });
  } catch (err) {
    next(err);
  }
});

// Eliminar
router.delete("/:id", auth, authorizeRole("comisionista"), async (req, res, next) => {
  try {
    const deleted = await TripPlan.findOneAndDelete({ _id: req.params.id, comisionistaId: req.user.id });
    if (!deleted) return res.status(404).json({ error: "Viaje no encontrado" });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;