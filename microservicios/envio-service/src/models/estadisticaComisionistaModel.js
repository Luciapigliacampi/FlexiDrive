import mongoose from "mongoose";

const EstadisticaComisionistaSchema = new mongoose.Schema({
  comisionistaId: {
    type: String,
    required: true,
    index: true,
  },

  fecha: {
    type: Date,
    required: true,
  },

  enviosTotales: {
    type: Number,
    default: 0,
  },

  entregas: {
    type: Number,
    default: 0,
  },

  retiros: {
    type: Number,
    default: 0,
  },

  ingresosTotales: {
    type: Number,
    default: 0,
  },

  distanciaKm: {
    type: Number,
    default: 0,
  },

  viajes: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true
});

export default mongoose.model(
  "EstadisticaComisionista",
  EstadisticaComisionistaSchema
);