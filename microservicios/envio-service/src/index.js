// microservicios/envio-service/src/index.js
import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import conectarDB from './config/db.js';
import envioRoutes from './routes/envioRoutes.js';
import testRoutes from './routes/testRoutes.js';
import { iniciarJobCancelacionVencidos } from './jobs/cancelarEnviosVencidos.js';

conectarDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/envios', envioRoutes);

// Solo monta el router de test si USE_TEST_DATE=true
// (el propio router tiene un guard interno, pero lo filtramos acá también
//  para que ni siquiera aparezca en producción)
if (process.env.USE_TEST_DATE === 'true') {
  app.use('/api/test', testRoutes);
  console.log('⚠️  Modo TEST activo — /api/test disponible');
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Micro Envíos en puerto ${PORT}`);
  iniciarJobCancelacionVencidos();
});
