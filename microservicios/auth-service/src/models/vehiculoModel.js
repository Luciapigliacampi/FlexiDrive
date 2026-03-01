// microservicios/auth-service/src/models/vehiculoModel.js
import mongoose from 'mongoose';

const vehiculoSchema = new mongoose.Schema({
  comisionistaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },
  // FIX: campos que el frontend envía y que faltaban en el schema
  nombre:    { type: String, default: "" },       // Ej: "Fiorino Blanca"
  adicionales: { type: String, default: "" },     // Año, color, seguro, etc.

  marca:   { type: String, required: true },
  modelo:  { type: String, required: true },
  patente: { type: String, required: true, unique: true },
  tipo: {
    type: String,
    enum: ['auto', 'camioneta', 'utilitario', 'furgon'],
    required: true,
  },
  capacidad:       { type: Number,  default: null },
  verificado:      { type: Boolean, default: false },
  tarjetaVerdeUrl: { type: String,  default: null },
}, { timestamps: true });

export default mongoose.model('Vehiculo', vehiculoSchema, 'vehiculos');
