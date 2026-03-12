// routes/estadisticasRoutes.js
import express from "express";
import {
  getEstadisticasComisionista,
  getEstadisticasCliente,
} from "../controllers/estadisticasController.js";

const router = express.Router();

router.get("/comisionista/:comisionistaId", getEstadisticasComisionista);
router.get("/cliente/:clienteId", getEstadisticasCliente);   // ← nueva

export default router;