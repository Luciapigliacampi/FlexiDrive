// microservicios/envio-service/src/jobs/cancelarEnviosVencidos.js
// ─── Corre cada 10 minutos.
//     Con USE_TEST_DATE=true usa la fecha/hora simulada (TEST_DATE + TEST_HOUR).
//     Podés dispararlo manualmente desde POST /api/test/cancelar-vencidos.
//
// Lógica: un envío vence si su fecha_entrega es ANTERIOR al inicio del día de hoy.
// Si fecha_entrega es HOY, todavía tiene todo el día para ser aceptado.

import cron from 'node-cron';
import Envio from '../models/envioModels.js';
import { getNow } from '../utils/testDate.js';

export async function cancelarVencidos() {
  const ahora = getNow();

  // Inicio del día en UTC puro — igual que getDayRange().
  // Con constructor local (new Date(y,m,d)) el límite queda +3hs en UTC-3,
  // cancelando por error envíos cuya fecha_entrega es HOY (guardada como T00:00:00Z).
  const yyyy = String(ahora.getUTCFullYear());
  const mm   = String(ahora.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(ahora.getUTCDate()).padStart(2, '0');
  const inicioDiaHoy = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);

  console.log(`🕐 [JOB] cancelarVencidos — hoy: ${inicioDiaHoy.toISOString().split('T')[0]}, ahora: ${ahora.toISOString()}`);

  try {
    const resultado = await Envio.updateMany(
      {
        estadoId: 'PENDIENTE',
        fecha_entrega: { $lt: inicioDiaHoy },   // ← estrictamente ANTES de hoy
        eliminado: { $ne: true },
      },
      { $set: { estadoId: 'CANCELADO' } }
    );

    if (resultado.modifiedCount > 0) {
      console.log(`✅ [JOB] ${resultado.modifiedCount} envío(s) cancelados por vencimiento.`);
    } else {
      console.log('✅ [JOB] No hay envíos vencidos.');
    }
  } catch (error) {
    console.error('❌ [JOB] Error al cancelar envíos vencidos:', error.message);
  }
}

export function iniciarJobCancelacionVencidos() {
  cron.schedule('*/1 * * * *', cancelarVencidos);
  console.log('⏰ [JOB] cancelarVencidos programado (cada 10 min)');
}
