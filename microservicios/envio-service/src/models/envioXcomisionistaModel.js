// microservicios/envio-service/src/models/envioXcomisionistaModel.js
import mongoose from 'mongoose';

const envioXComisionistaSchema = new mongoose.Schema({
  comisionistaId: { type: mongoose.Schema.Types.ObjectId, required: true },
  envioId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Envio', required: true },
  vehiculoId:     { type: mongoose.Schema.Types.ObjectId, required: true },
  // tripPlanId puede ser null si el comisionista acepta un envío sin tener un TripPlan activo
  tripPlanId:     { type: mongoose.Schema.Types.ObjectId, default: null },
  precio_final:   { type: Number },

  fecha_asignacion:     { type: Date, default: Date.now },
  fecha_inicio_retiro:  { type: Date },
  fecha_retiro:         { type: Date },
  fecha_demora:         { type: Date },
  fecha_inicio:         { type: Date },
  fecha_fin:            { type: Date },

  estado_id: {
    type: String,
    enum: [
      'PENDIENTE', 'ASIGNADO', 'EN_RETIRO', 'EN_CAMINO',
      'ENTREGADO', 'DEMORADO', 'CANCELADO', 'CANCELADO_RETORNO', 'DEVUELTO',
    ],
    default: 'PENDIENTE',
  },
}, { timestamps: true });

export default mongoose.model('EnvioXComisionista', envioXComisionistaSchema, 'envioXComisionista');
