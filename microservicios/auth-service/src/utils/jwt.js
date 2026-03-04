//microservicios\auth-service\src\utils\jwt.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretoflexidrive123';

export const generarTokenTemporal = (payload) => {
  // Token de 5 minutos para el flujo de 2FA
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
};

export const generarTokenSesion = (payload) => {
  // Token de 24 horas para cuando ya entró a la App
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '72h' });
};

export const verificarToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Token inválido o expirado');
  }
};