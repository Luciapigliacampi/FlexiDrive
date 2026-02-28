import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import calificacionRoutes from './routes/calificacionRoutes.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/calificaciones', calificacionRoutes);

// Error Handler básico
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Error interno del servidor";
  res.status(status).json({ error: message });
});

// Conexión a MongoDB y Arranque
const PORT = process.env.PORT || 3003;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB (Calificaciones)");
    app.listen(PORT, () => console.log(`🚀 Microservicio Calificaciones en puerto ${PORT}`));
  })
  .catch(err => console.error("❌ Error de conexión:", err));