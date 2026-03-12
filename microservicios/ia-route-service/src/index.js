// microservicios/ia-route-service/src/index.js

import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import routeRoutes from './routes/routeRoutes.js';
import testRoutes from './routes/testRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado (IA Service)'))
  .catch(err => console.error('❌ Error MongoDB:', err));

app.use('/api/rutas', routeRoutes);

if (process.env.USE_TEST_DATE === 'true') {
  app.use('/api/test', testRoutes);
  console.log('⚠️  Modo TEST activo — /api/test disponible (ia-route-service)');
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🧠 IA & Route Service corriendo en puerto ${PORT}`);
});
