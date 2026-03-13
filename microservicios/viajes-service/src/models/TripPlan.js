import mongoose from "mongoose";

const PlaceSchema = new mongoose.Schema(
  {
    provinciaId: { type: String, required: true },
    provinciaNombre: { type: String, default: "" },
    localidadId: { type: String, required: true },
    localidadNombre: { type: String, default: "" },
  },
  { _id: false }
);

const PrecioPorLocalidadSchema = new mongoose.Schema(
  {
    localidadId: { type: String, required: true },
    localidadNombre: { type: String, default: "" },
    precio: { type: Number, required: true },
  },
  { _id: false }
);

const TripPlanSchema = new mongoose.Schema(
  {
    comisionistaId: { type: String, required: true },

    vehiculoId: { type: String, required: true },

    origen: { type: PlaceSchema, required: true },
    destino: { type: PlaceSchema, required: true },
    intermedias: { type: [PlaceSchema], default: [] },

    diasSemana: { type: [Number], required: true },

    activo: { type: Boolean, default: true },

    preciosPorLocalidad: { type: [PrecioPorLocalidadSchema], default: [] },

    descuentoPorBultos: {
      minBultos: { type: Number, default: 0 },
      tipo: { type: String, enum: ["porcentaje", "monto"], default: "porcentaje" },
      valor: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("TripPlan", TripPlanSchema, "tripplans");