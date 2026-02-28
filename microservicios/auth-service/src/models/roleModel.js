//microservicios\auth-service\src\models\roleModel.js
import mongoose from 'mongoose';

const RolSchema = new mongoose.Schema({
  _id: String,
  nombre: String
});

export default mongoose.model('Rol', RolSchema, 'rol');

