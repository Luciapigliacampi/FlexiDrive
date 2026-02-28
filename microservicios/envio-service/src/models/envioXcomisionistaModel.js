//microservicios\envio-service\src\models\envioXcomisionistaModel.js
import mongoose from 'mongoose';

const envioXComisionistaSchema = new mongoose.Schema({
  comisionistaId: { type: mongoose.Schema.Types.ObjectId, required: true },
  envioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Envio', required: true }, 
  vehiculoId: { type: mongoose.Schema.Types.ObjectId, required: true }, // El que Marta elija al aceptar
  fecha_asignacion: { type: Date, default: Date.now },
  fecha_retiro: { type: Date },
  fecha_demora: { type: Date },
  fecha_inicio: { type: Date },
  fecha_fin: { type: Date },
  tripPlanId: { type: mongoose.Schema.Types.ObjectId, required: true },
precio_final: { type: Number },
  estado_id: { 
    type: String, 
    enum: ['PENDIENTE', 
      'ASIGNADO', 
      'EN_RETIRO', 
      'EN_CAMINO', 
      'ENTREGADO', 
      'DEMORADO', 
      'CANCELADO', 
      'CANCELADO_RETORNO', 
      'DEVUELTO'],
    default: 'PENDIENTE' 
  }
}, { timestamps: true });

export default mongoose.model('EnvioXComisionista', envioXComisionistaSchema, 'envioXComisionista');