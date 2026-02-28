//microservicios\viajes-service\src\models\TripPlan.js
import mongoose from "mongoose";

const TripPlanSchema = new mongoose.Schema(
  {
    comisionistaId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },


    // 🚗 Vehículo
    vehiculoId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // Ruta principal
    origenCiudad: { type: String, required: true, index: true },
    destinoCiudad: { type: String, required: true, index: true },

    // Localidades intermedias
    paradas: { type: [String], default: [] },

    // Días de semana
    diasSemana: {
      type: [Number],
      required: true,
      validate: (arr) => arr.length > 0 && arr.every((n) => n >= 0 && n <= 6),
      index: true
    },

    // 💰 Precios
    preciosPorLocalidad: [
      {
        localidad: String,
        precio: Number
      }
    ],

    descuentoPorBultos: {
      // desde cuántos bultos aplica
      minBultos: { type: Number, default: 0 },
      // "porcentaje" o "monto"
      tipo: { type: String, enum: ["porcentaje", "monto"], default: "porcentaje" },
      // porcentaje (0-100) o monto fijo ($)
      valor: { type: Number, default: 0 },
    },

    // Disponibilidad
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

TripPlanSchema.index({ origenCiudad: 1, destinoCiudad: 1, activo: 1 });

export default mongoose.model("TripPlan", TripPlanSchema);