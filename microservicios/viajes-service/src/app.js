//microservicios\viajes-service\src\app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";

import tripPlansRoutes from "./routes/tripPlans.routes.js";
import searchRoutes from "./routes/search.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/health", (req, res) => res.json({ ok: true, service: "viajes-service" }));

  app.use("/api/trip", tripPlansRoutes);
  app.use("/api/search", searchRoutes);

  app.use(errorHandler);
  return app;
}