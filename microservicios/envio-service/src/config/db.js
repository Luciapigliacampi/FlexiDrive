//microservicios\envio-service\src\config\db.js
import mongoose from 'mongoose'; // CAMBIAR ESTO

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

export default conectarDB;