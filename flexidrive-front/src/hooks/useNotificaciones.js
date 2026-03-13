// flexidrive-front/src/hooks/useNotificaciones.js
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api'; // axios instance con baseURL y token

const NOTIF_BASE = import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const WS_BASE    = NOTIF_BASE.replace(/^http/, 'ws');

export default function useNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading]               = useState(true);
  const wsRef       = useRef(null);
  const borradasRef = useRef(new Set()); // IDs eliminados — filtra repush del WS

  const fetchNotificaciones = useCallback(async () => {
    try {
      const { data } = await api.get(`${NOTIF_BASE}/api/notificaciones`);
      const visibles = Array.isArray(data) ? data.filter((n) => n.visible !== false) : [];
      setNotificaciones(visibles);
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
            const id = msg.data?._id;
            // Ignorar notificaciones que el usuario ya borró en esta sesión
            if (id && borradasRef.current.has(id)) return;
            setNotificaciones((prev) => {
              // Evitar duplicados si el WS la reenvía antes de que llegue el fetch
              if (id && prev.some((n) => n._id === id)) return prev;
              return [msg.data, ...prev];
            });
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

  const eliminarNotificacion = useCallback(async (id) => {
    borradasRef.current.add(id); // marcar como borrada antes del optimistic update
    setNotificaciones((prev) => prev.filter((n) => n._id !== id));
    try {
      await api.patch(`${NOTIF_BASE}/api/notificaciones/${id}/ocultar`);
    } catch (err) {
      console.error('[useNotificaciones] eliminarNotificacion error:', err.message);
      borradasRef.current.delete(id); // revertir si falla
      fetchNotificaciones();
    }
  }, [fetchNotificaciones]);

  const eliminarTodas = useCallback(async () => {
    // Registrar todos los IDs actuales como borrados
    setNotificaciones((prev) => {
      prev.forEach((n) => borradasRef.current.add(n._id));
      return [];
    });
    try {
      await api.patch(`${NOTIF_BASE}/api/notificaciones/ocultar-todas`);
    } catch (err) {
      console.error('[useNotificaciones] eliminarTodas error:', err.message);
      borradasRef.current.clear();
      fetchNotificaciones();
    }
  }, [fetchNotificaciones]);

  const noLeidasCount = notificaciones.filter((n) => !n.leida).length;

  return {
    notificaciones,
    loading,
    noLeidasCount,
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
    eliminarTodas,
  };
}
