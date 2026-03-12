import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api'; // axios instance con baseURL y token

const NOTIF_BASE = import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const WS_BASE    = NOTIF_BASE.replace(/^http/, 'ws');

export default function useNotificaciones() {
  const [notificaciones, setNotificaciones]   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const wsRef = useRef(null);

  const fetchNotificaciones = useCallback(async () => {
    try {
      const { data } = await api.get(`${NOTIF_BASE}/api/notificaciones`);
      setNotificaciones(data);
    } catch (err) {
      console.error('[useNotificaciones] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Conectar WebSocket con reconexión automática
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let ws;
    let reconnectTimeout;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => console.log('[WS] conectado');

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'NOTIFICACION') {
            setNotificaciones((prev) => [msg.data, ...prev]);
          }
        } catch {}
      };

      ws.onerror = (e) => console.error('[WS] error:', e);

      ws.onclose = () => {
        if (!destroyed) {
          console.log('[WS] desconectado, reconectando en 3s...');
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []);

  // Fetch inicial
  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  const marcarLeida = useCallback(async (id) => {
    try {
      await api.patch(`${NOTIF_BASE}/api/notificaciones/${id}/leer`);
      setNotificaciones((prev) =>
        prev.map((n) => (n._id === id ? { ...n, leida: true } : n))
      );
    } catch (err) {
      console.error('[useNotificaciones] marcarLeida error:', err.message);
    }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await api.patch(`${NOTIF_BASE}/api/notificaciones/leer-todas`);
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (err) {
      console.error('[useNotificaciones] marcarTodasLeidas error:', err.message);
    }
  }, []);

  const noLeidasCount = notificaciones.filter((n) => !n.leida).length;

  return { notificaciones, loading, noLeidasCount, marcarLeida, marcarTodasLeidas };
}
