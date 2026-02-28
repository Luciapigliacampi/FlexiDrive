// microservicios/viajes-service/src/config/db.js
import mongoose from "mongoose";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB conectado (viajes-service)");
}