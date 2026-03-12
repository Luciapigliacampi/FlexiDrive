import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import conectarDB from "./config/db.js";
import envioRoutes from "./routes/envioRoutes.js";
import estadisticasRoutes from "./routes/estadisticasRoutes.js";
import { iniciarJobCancelacionVencidos } from "./jobs/cancelarEnviosVencidos.js";

dotenv.config();

conectarDB();
iniciarJobCancelacionVencidos();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/envios", envioRoutes);
app.use("/api/estadisticas", estadisticasRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Micro Envíos en puerto ${PORT}`);
});