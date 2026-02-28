//microservicios\ia-route-service\src\models\rutaOptimaModel.js
import mongoose from 'mongoose';


const rutaOptimaSchema = new mongoose.Schema({
  comisionistaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha_generada: { type: Date, default: Date.now },
  
  // Lista ordenada de los envíos
  orden_entregas: [{
    envioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Envio' },
    orden: Number,
    lat: Number, // Guardamos la lat/lng acá también para acceso rápido
    lng: Number
  }],

  polyline: String, // El "dibujo" de la ruta para el mapa
  distancia_total_km: Number,
  tiempo_estimado_min: Number,
  activo: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('RutaOptima', rutaOptimaSchema, 'rutasOptimas');