import mongoose from "mongoose";

const EstadisticaClienteSchema = new mongoose.Schema(
  {
    clienteId: {
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
    enviosEntregados: {
      type: Number,
      default: 0,
    },
    enviosPendientes: {
      type: Number,
      default: 0,
    },
    enviosCancelados: {
      type: Number,
      default: 0,
    },
    gastoTotal: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "EstadisticaCliente",
  EstadisticaClienteSchema,
  "estadisticascliente"
);