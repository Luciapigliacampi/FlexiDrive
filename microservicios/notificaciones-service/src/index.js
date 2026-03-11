import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { setupWebSocket } from './utils/wsManager.js';
import notificacionRoutes from './routes/notificacionRoutes.js';
import conectarDB from './config/db.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/notificaciones', notificacionRoutes);

app.use((err, req, res, _next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: err.message || 'Error interno.' });
});

const server = http.createServer(app);

async function startServer() {
  try {
    await conectarDB();

    setupWebSocket(server);

    const PORT = process.env.PORT || 3005;
    server.listen(PORT, () => {
      console.log(`🔔 Notification Service corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error iniciando Notification Service:', err.message);
    process.exit(1);
  }
}

startServer();