
//microservicios\ia-route-service\src\index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import routeRoutes from './routes/routeRoutes.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Conexión a DB (opcional si vas a guardar rutas, pero recomendado)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado (IA Service)'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// Rutas
app.use('/api/rutas', routeRoutes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🧠 IA & Route Service corriendo en puerto ${PORT}`);
});