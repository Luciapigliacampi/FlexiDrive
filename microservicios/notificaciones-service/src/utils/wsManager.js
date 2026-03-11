import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

// Map userId (string) → Set<WebSocket>
const clients = new Map();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    verifyClient: ({ origin }, cb) => cb(true), // permitir cualquier origen
  });

  wss.on('connection', (ws, req) => {
    // El cliente envía el token como query param: /ws?token=...
    const url = new URL(req.url, `http://localhost`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Token requerido');
      return;
    }

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = String(decoded.id);
    } catch {
      ws.close(1008, 'Token inválido');
      return;
    }

    // Registrar conexión
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId).add(ws);
    console.log(`[WS] cliente conectado → userId=${userId} total_conexiones=${clients.get(userId).size}`);

    ws.on('close', () => {
      clients.get(userId)?.delete(ws);
      if (clients.get(userId)?.size === 0) clients.delete(userId);
    });

    ws.on('error', () => ws.terminate());

    // Ping/pong para mantener la conexión viva
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Heartbeat cada 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(interval));

  console.log('🔌 WebSocket listo en /ws');
  return wss;
}

/**
 * Envía una notificación en tiempo real a un usuario si está conectado.
 */
export function pushNotificacion(userId, notificacion) {
  const key = String(userId);
  const sockets = clients.get(key);
  console.log(`[WS] push → userId=${key} clientes_conectados=${sockets?.size ?? 0} tipo=${notificacion.tipo}`);
  if (!sockets?.size) return;

  const payload = JSON.stringify({ type: 'NOTIFICACION', data: notificacion });
  sockets.forEach((ws) => {
    if (ws.readyState === 1) ws.send(payload);
  });
}
