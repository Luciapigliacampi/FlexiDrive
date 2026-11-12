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

  fecha_entrega: { type: Date, required: true },
  franja_horaria_retiro: { type: String, required: true },
  fecha_retiro: { type: Date, default: null },

  estadoId: {
    type: String,
    enum: [
      'PENDIENTE', 'ASIGNADO', 'RETIRADO', 'EN_RETIRO', 'EN_CAMINO',
      'DEMORADO_RETIRO',   // viaje terminó antes de retirar → aparece en ruta del día siguiente
      'DEMORADO_ENTREGA',  // viaje terminó antes de entregar → aparece en ruta del día siguiente
      'ENTREGADO', 'CANCELADO', 'CANCELADO_RETORNO', 'DEVUELTO',
    ],
    default: 'PENDIENTE',
  },

  tripPlanId: { type: mongoose.Schema.Types.ObjectId, default: null },

  notas_adicionales: String,
  polyline_especifica: { type: String, default: "" },

  archivado: { type: Boolean, default: false },

  // Fecha del viaje que puso al envío en curso (EN_RETIRO / EN_CAMINO).
  // Si es de hoy, el envío es parte del viaje actual y no se marca como demorado.
  en_viaje_fecha: { type: Date, default: null },
  // Cancelado con el paquete ya retirado: el comisionista debe devolverlo al origen.
  requiere_devolucion: { type: Boolean, default: false },
  estadoId_previo: { type: String, default: null },
  eliminado: { type: Boolean, default: false },

  metodo_pago_cliente: {
    type: String,
    enum: ['efectivoOrigen', 'efectivoDestino', 'transferencia', null],
    default: null,
  },

  pago: {
    confirmado:  { type: Boolean, default: false },
    metodo:      { type: String, enum: ['efectivo', 'transferencia'], default: null },
    fecha:       { type: Date, default: null },
  },
}, { timestamps: true });

export default mongoose.model('Envio', envioSchema, 'envios');
