// microservicios/viajes-service/src/server.js
import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 3004;

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`✅ viajes-service corriendo en http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("❌ No se pudo iniciar viajes-service:", err);
  process.exit(1);
});