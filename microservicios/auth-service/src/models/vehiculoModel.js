//microservicios\auth-service\src\models\vehiculoModel.js
import mongoose from 'mongoose';

const vehiculoSchema = new mongoose.Schema({
  comisionistaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario', // Apuntamos al ID de usuario de Marta
    required: true
  },
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  patente: { type: String, required: true, unique: true },
  tipo: { 
    type: String, 
    enum: ['auto', 'camioneta', 'utilitario', 'furgon'], 
    required: true 
  },
  capacidad: { type: Number, required: true }, // Ej: en kg o m3
  verificado: { type: Boolean, default: false },
  tarjetaVerdeUrl: { type: String, required: false } // Para la validación legal
}, { timestamps: true });

export default mongoose.model('Vehiculo', vehiculoSchema, 'vehiculos');