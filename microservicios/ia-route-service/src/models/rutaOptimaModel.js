// microservicios/ia-route-service/src/models/rutaOptimaModel.js
import mongoose from 'mongoose';

const paradaSchema = new mongoose.Schema({
  envioId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'Envio', required: true },
  nro_envio:               { type: String },
  orden:                   { type: Number, required: true },
  tipo:                    { type: String, enum: ['RETIRO', 'ENTREGA', 'RETORNO'], required: true },
  lat:                     { type: Number, required: true },
  lng:                     { type: Number, required: true },
  texto:                   { type: String },
  franja_horaria:          { type: String },
  fecha_retiro_confirmada: { type: Date, default: null },
  completada:              { type: Boolean, default: false },
  completada_at:           { type: Date, default: null },
  distancia_km:  { type: Number, default: null },
}, { _id: false });

const rutaOptimaSchema = new mongoose.Schema({
  comisionistaId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha_generada:      { type: Date, default: Date.now },
  fecha_viaje:         { type: Date, required: true },
  orden_entregas:      [paradaSchema],
  polyline:            { type: String },
  distancia_total_km:  { type: Number },
  tiempo_estimado_min: { type: Number },
  activo:              { type: Boolean, default: true },
  viaje_iniciado:      { type: Boolean, default: false },
  // ✅ Punto de partida persistido al iniciar viaje
  lat_inicio:          { type: Number, default: null },
  lng_inicio:          { type: Number, default: null },
}, { timestamps: true });

rutaOptimaSchema.index({ comisionistaId: 1, activo: 1, fecha_viaje: -1 });

export default mongoose.model('RutaOptima', rutaOptimaSchema, 'rutasOptimas');
