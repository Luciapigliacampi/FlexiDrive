import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://flexidrive9098:pabKgmiueWxx57TH@cluster0.j8jsbvb.mongodb.net/?retryWrites=true&w=majority";

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