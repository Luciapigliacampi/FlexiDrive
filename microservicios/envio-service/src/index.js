// microservicios/envio-service/src/index.js
import express from "express";
import cors from "cors";
import conectarDB from "./config/db.js";
import envioRoutes from "./routes/envioRoutes.js";
import estadisticasRoutes from "./routes/estadisticasRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import { iniciarJobCancelacionVencidos } from "./jobs/cancelarEnviosVencidos.js";

conectarDB();
iniciarJobCancelacionVencidos();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/envios", envioRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/test", testRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Micro Envíos en puerto ${PORT}`);
});
