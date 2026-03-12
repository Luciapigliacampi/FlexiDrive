import axios from 'axios';

const NOTIF_BASE = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

/**
 * Crea una notificación en el notification-service.
 * Fire-and-forget: nunca lanza, solo loguea si falla.
 *
 * @param {Object} data
 * @param {string} data.userId
 * @param {string} data.rol         'cliente' | 'comisionista'
 * @param {string} data.tipo
 * @param {string} data.titulo
 * @param {string} data.contenido
 * @param {string} [data.envioId]
 */
export function notificar(data) {
  console.log(`[notificar] Enviando tipo=${data.tipo} userId=${data.userId}`);
  axios
    .post(`${NOTIF_BASE}/api/notificaciones`, data, {
      headers: { 'x-internal-key': INTERNAL_KEY },
    })
    .then(() => console.log('[notificar] OK:', data.tipo))
    .catch((err) => {
      console.error('[notificar] ERROR:', err.message);
      if (err.response) console.error('[notificar] Response:', err.response.status, JSON.stringify(err.response.data));
    });
}

// ── Helpers por evento ───────────────────────────────────────────────────────

export function notifEnvioAceptado({ userId, envioId, nroEnvio, comisionistaNombre }) {
  notificar({
    userId, rol: 'cliente', tipo: 'ENVIO_ACEPTADO', envioId,
    titulo: 'Envío aceptado',
    contenido: `Tu envío ${nroEnvio} fue aceptado por ${comisionistaNombre}.`,
  });
}

export function notifEstadoActualizado({ userId, envioId, nroEnvio, nuevoEstado }) {
  const labels = {
    EN_RETIRO:        'está siendo retirado',
    RETIRADO:         'fue retirado',
    EN_CAMINO:        'está en camino',
    ENTREGADO:        'fue entregado',
    DEMORADO:         'está demorado',
    CANCELADO_RETORNO:'está en retorno al origen',
    DEVUELTO:         'fue devuelto al remitente',
  };
  const label = labels[nuevoEstado] || nuevoEstado;
  notificar({
    userId, rol: 'cliente', tipo: 'ESTADO_ACTUALIZADO', envioId,
    titulo: 'Estado de envío actualizado',
    contenido: `Tu envío ${nroEnvio} ${label}.`,
  });
}

export function notifRetiroConfirmado({ userId, envioId, nroEnvio }) {
  notificar({
    userId, rol: 'cliente', tipo: 'RETIRO_CONFIRMADO', envioId,
    titulo: 'Retiro confirmado',
    contenido: `El comisionista confirmó el retiro de tu envío ${nroEnvio}.`,
  });
}

export function notifCanceladoPorComisionista({ userId, envioId, nroEnvio }) {
  notificar({
    userId, rol: 'cliente', tipo: 'ENVIO_CANCELADO_POR_COMISIONISTA', envioId,
    titulo: 'Envío cancelado',
    contenido: `Tu envío ${nroEnvio} fue cancelado por el comisionista.`,
  });
}

export function notifNuevoEnvioDisponible({ userId, envioId, nroEnvio, origen, destino }) {
  notificar({
    userId, rol: 'comisionista', tipo: 'NUEVO_ENVIO_DISPONIBLE', envioId,
    titulo: 'Nuevo envío disponible',
    contenido: `Nuevo envío ${nroEnvio} disponible: ${origen} → ${destino}.`,
  });
}

export function notifCanceladoPorCliente({ userId, envioId, nroEnvio }) {
  notificar({
    userId, rol: 'comisionista', tipo: 'ENVIO_CANCELADO_POR_CLIENTE', envioId,
    titulo: 'Envío cancelado por el cliente',
    contenido: `El cliente canceló el envío ${nroEnvio}.`,
  });
}
