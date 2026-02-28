//microservicios\auth-service\src\models\userRoleModel.js
import mongoose from 'mongoose';

const UsuarioRolSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  rolId: {
    type: String,
    ref: 'Rol',
    required: true
  },
  creado_en: { type: Date, default: Date.now }
});

export default mongoose.model('UsuarioRol', UsuarioRolSchema, 'usuarioxrol');
