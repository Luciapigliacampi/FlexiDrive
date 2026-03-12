import express from "express";
import { getEstadisticasComisionista } from "../controllers/estadisticasController.js";

const router = express.Router();

router.get("/comisionista/:comisionistaId", getEstadisticasComisionista);

export default router;