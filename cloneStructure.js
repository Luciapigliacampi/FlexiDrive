import { MongoClient } from "mongodb";

// La URI se toma del .env (nunca escribir credenciales en el código). Ejecutar con:
//   node --env-file=microservicios/auth-service/.env cloneStructure.js
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]); // el DNS del router falla con mongodb+srv
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ Falta MONGODB_URI. Ejecutá: node --env-file=microservicios/auth-service/.env cloneStructure.js");
  process.exit(1);
}

const sourceDB = "flexidrive";
const targetDB = "flexidrive_test";

async function cloneStructure() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const source = client.db(sourceDB);
    const target = client.db(targetDB);

    const collections = await source.listCollections().toArray();

    console.log("Colecciones encontradas:");

    for (const col of collections) {
      console.log("→", col.name);

      const exists = await target.listCollections({ name: col.name }).toArray();

      if (exists.length === 0) {
        await target.createCollection(col.name);
        console.log("   creada en flexidrive_test");
      } else {
        console.log("   ya existe");
      }
    }

    console.log("\n✅ Estructura clonada correctamente");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

cloneStructure();