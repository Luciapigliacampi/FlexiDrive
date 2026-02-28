//microservicios\auth-service\src\middlewares\uploadMiddleware.js
import multer from 'multer';
import path from 'path';

// Configuración de dónde y cómo se guardan
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Asegurate de crear esta carpeta en la raíz
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });