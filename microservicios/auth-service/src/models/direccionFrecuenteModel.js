//microservicios\auth-service\src\models\direccionFrecuenteModel.js
import mongoose from "mongoose";

const DireccionFrecuenteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, index: true },
    alias: { type: String, required: true, trim: true },
    direccion: { type: String, required: true, trim: true },
     provincia: {
      provinciaId: { type: String, required: true, trim: true },
      provinciaNombre: { type: String, required: true, trim: true },
    },
    localidad: {
      localidadId: { type: String, required: true, trim: true },
      localidadNombre: { type: String, required: true, trim: true },
    },
    cp: { type: String, required: true, trim: true },

    // geo (nuevo)
    placeId: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("DireccionFrecuente", DireccionFrecuenteSchema, "direccionesFrecuentes");