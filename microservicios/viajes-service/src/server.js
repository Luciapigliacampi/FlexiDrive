// microservicios/viajes-service/src/server.js
// DNS público: el DNS del router falla en las consultas SRV de mongodb+srv
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
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