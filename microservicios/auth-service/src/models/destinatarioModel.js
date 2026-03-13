//microservicios\auth-service\src\models\destinatarioModel.js
import mongoose from "mongoose";

const DestinatarioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, index: true },

    apellido: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    dni: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },

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

// opcional: evitar duplicados exactos de DNI por usuario
DestinatarioSchema.index({ userId: 1, dni: 1 }, { unique: false });

export default mongoose.model("Destinatario", DestinatarioSchema, "destinatarios");