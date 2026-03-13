//microservicios\notificaciones-service\src\models\notificacionModel.js
import mongoose from 'mongoose';

const notificacionSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    rol:      { type: String, enum: ['cliente', 'comisionista'], required: true },
    tipo:     {
      type: String,
      enum: [
        // cliente
        'ENVIO_ACEPTADO',
        'ESTADO_ACTUALIZADO',
        'RETIRO_CONFIRMADO',
        'ENVIO_CANCELADO_POR_COMISIONISTA',
        'PAGO_CONFIRMADO',
        'PROMOCION',
        // comisionista
        'NUEVO_ENVIO_DISPONIBLE',
        'ENVIO_CANCELADO_POR_CLIENTE',
        'RECORDATORIO_ENTREGAS',
      ],
      required: true,
    },
    titulo:   { type: String, required: true },
    contenido:{ type: String, required: true },
    leida:    { type: Boolean, default: false },
    visible:    { type: Boolean, default: true },
    envioId:  { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('notificaciones', notificacionSchema);
