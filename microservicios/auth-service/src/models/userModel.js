import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema({
  nombre: String,
  apellido: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  contraseña_hash: String,
  estado: {
    type: String,
    default: "activo",
  },
  dni: Number,
  fecha_nacimiento: Date,
  fecha_registro: {
    type: Date,
    default: Date.now,
  },
  telefono: {
    type: String,
    required: false,
    default: "",
    match: [/^\d{10}$/, "El teléfono debe tener exactamente 10 dígitos."],
  },
  totpSecret: String,
  tempTotpSecret: String, // flujo de activación / confirmación
});

export default mongoose.model("Usuario", UsuarioSchema, "usuarios");