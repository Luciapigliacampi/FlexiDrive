// microservicios/envio-service/src/utils/estadosAutomaticos.js
// Transiciones automáticas por fecha (respetan el simulador vía getNow()).
//
// Según la tabla de estados:
//   ACEPTADO / EN RETIRO  → DEMORADO (RETIRO)   si ya pasó la fecha de retiro
//   RETIRADO / EN CAMINO  → DEMORADO (ENTREGA)  si ya pasó la fecha de entrega
// …siempre que el comisionista NO haya iniciado un viaje hoy que incluya el envío.
// Eso se sabe por `en_viaje_fecha`: la fecha del viaje que lo activó (iniciar viaje,
// franja que arrancó, retiro dentro del viaje). Si es de hoy, el envío está en curso.
import Envio from '../models/envioModels.js';
import { getNow } from './testDate.js';

export function inicioDiaUTC(fecha = getNow()) {
  const yyyy = fecha.getUTCFullYear();
  const mm   = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(fecha.getUTCDate()).padStart(2, '0');
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
}

export async function marcarDemoradosPorFecha(filtroExtra = {}) {
  const hoy = inicioDiaUTC();
  const noEnViajeDeHoy = {
    $or: [{ en_viaje_fecha: { $exists: false } }, { en_viaje_fecha: null }, { en_viaje_fecha: { $lt: hoy } }],
  };

  const [retiro, entrega] = await Promise.all([
    Envio.updateMany(
      {
        ...filtroExtra,
        fecha_retiro: { $lt: hoy },
        $or: [
          { estadoId: 'ASIGNADO' },
          { estadoId: 'EN_RETIRO', ...noEnViajeDeHoy },
        ],
      },
      { $set: { estadoId: 'DEMORADO_RETIRO' } }
    ),
    Envio.updateMany(
      {
        ...filtroExtra,
        fecha_entrega: { $lt: hoy },
        $or: [
          { estadoId: 'RETIRADO' },
          { estadoId: 'EN_CAMINO', ...noEnViajeDeHoy },
        ],
      },
      { $set: { estadoId: 'DEMORADO_ENTREGA' } }
    ),
  ]);

  return { demoradosRetiro: retiro.modifiedCount, demoradosEntrega: entrega.modifiedCount };
}
