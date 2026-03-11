//microservicios\envio-service\src\models\envioModels.js
import mongoose from 'mongoose';

const envioSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, required: true },
  comisionistaId: { type: mongoose.Schema.Types.ObjectId, default: null },
  destinatarioId: { type: mongoose.Schema.Types.ObjectId, default: null },

  direccion_origen: {
    texto: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  direccion_destino: {
    texto: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },

  origenCiudad: {
    localidadId: { type: String, required: true },
    localidadNombre: { type: String, required: true },
  },

  destinoCiudad: {
    localidadId: { type: String, required: true },
    localidadNombre: { type: String, required: true },
  },

  nro_envio: { type: String, unique: true },

  paquetes: [{
    alto: Number, ancho: Number, profundidad: Number, peso: Number,
    contenido: String,
    fragil: { type: Boolean, default: false },
    codigo_paquete: String,
    clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  }],

  costo_estimado: { type: Number, required: true },

  // ✅ Fecha en que debe entregarse el paquete. La elige el cliente. Sin hora.
  fecha_entrega: { type: Date, required: true },

  // ✅ Franja horaria en que el paquete estará disponible para retiro. La elige el cliente.
  //    Formato: "HH:MM-HH:MM"  ej: "08:00-12:00"
  franja_horaria_retiro: { type: String, required: true },

  // ✅ Fecha en que el comisionista efectivamente retira el paquete.
  //    La decide el comisionista (puede ser cualquier día hasta la fecha_entrega).
  //    Queda null hasta que el comisionista la confirme.
  fecha_retiro: { type: Date, default: null },

 estadoId: {
  type: String,
  enum: ['PENDIENTE','ASIGNADO','RETIRADO','EN_RETIRO','EN_CAMINO','DEMORADO',
         'ENTREGADO','CANCELADO','CANCELADO_RETORNO','DEVUELTO'],
  default: 'PENDIENTE',
},


  tripPlanId: { type: mongoose.Schema.Types.ObjectId, default: null },

  notas_adicionales: String,
  polyline_especifica: { type: String, default: "" },

  // ✅ Borrado lógico y archivo
  archivado: { type: Boolean, default: false },
  eliminado: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Envio', envioSchema, 'envios');