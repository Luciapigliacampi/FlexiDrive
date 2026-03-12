// microservicios/ia-route-service/src/routes/testRoutes.js
// Solo disponible cuando USE_TEST_DATE=true
// Permite cambiar TEST_DATE y TEST_HOUR en runtime sin reiniciar.
//
// Endpoints:
//   GET   /api/test/config  → estado actual
//   PATCH /api/test/config  → { fecha?, hora? }

import express from 'express';
import { getNow } from '../utils/testDate.js';

const router = express.Router();

// Guard: solo en modo test
router.use((req, res, next) => {
  if (process.env.USE_TEST_DATE !== 'true') {
    return res.status(403).json({ error: 'Solo disponible con USE_TEST_DATE=true' });
  }
  next();
});

// GET /api/test/config
router.get('/config', (req, res) => {
  res.json({
    USE_TEST_DATE: process.env.USE_TEST_DATE,
    TEST_DATE:     process.env.TEST_DATE,
    TEST_HOUR:     process.env.TEST_HOUR,
    nowSimulado:   getNow().toISOString(),
  });
});

// PATCH /api/test/config  { fecha?: "YYYY-MM-DD", hora?: 0-23 }
router.patch('/config', (req, res) => {
  const { fecha, hora } = req.body;

  if (fecha !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'fecha debe tener formato YYYY-MM-DD' });
    }
    process.env.TEST_DATE = fecha;
  }

  if (hora !== undefined) {
    const h = parseInt(hora, 10);
    if (isNaN(h) || h < 0 || h > 23) {
      return res.status(400).json({ error: 'hora debe ser un número entre 0 y 23' });
    }
    process.env.TEST_HOUR = String(h);
  }

  res.json({
    ok:          true,
    TEST_DATE:   process.env.TEST_DATE,
    TEST_HOUR:   process.env.TEST_HOUR,
    nowSimulado: getNow().toISOString(),
  });
});

export default router;
