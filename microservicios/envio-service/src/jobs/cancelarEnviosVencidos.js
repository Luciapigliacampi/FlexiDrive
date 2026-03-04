// microservicios/envio-service/src/jobs/cancelarEnviosVencidos.js
import cron from 'node-cron';
import Envio from '../models/envioModels.js';

async function cancelarVencidos() {
  console.log('🕐 [JOB] Verificando envíos vencidos...');
  try {
    const ahora = new Date();

    const resultado = await Envio.updateMany(
      {
        estadoId: 'PENDIENTE',
        fecha_entrega: { $lt: ahora },
        eliminado: { $ne: true },
      },
      {
        $set: { estadoId: 'CANCELADO' },
      }
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
  // ✅ Ejecutar inmediatamente al iniciar el servicio
  cancelarVencidos();

  // Luego corre todos los días a las 00:05
  cron.schedule('5 0 * * *', cancelarVencidos);

  console.log('⏰ [JOB] Job de cancelación de envíos vencidos iniciado.');
}