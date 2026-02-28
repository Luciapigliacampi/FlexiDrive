import mongoose from 'mongoose';

const calificacionSchema = new mongoose.Schema({
  envioId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true }, // Un solo voto por envío
  emisorId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Ana (Cliente)
  receptorId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Marta (Comisionista)
  puntuacion: { type: Number, required: true, min: 1, max: 10 },
  comentario: { type: String, maxLength: 200 },
  fecha: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Calificacion', calificacionSchema, 'calificaciones');