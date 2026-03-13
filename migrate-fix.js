/**
 * migrate-fix.js
 *
 * Migración parcial — NO borra ni re-seedea.
 * Corrige en la DB existente:
 *   1. Patentes de vehículos → formato AA000AA con prefijo AA-AG
 *   2. nro_envio → formato FD-XXXX-XXXX
 *   3. Coordenadas y texto de direcciones → reales por ciudad
 *
 * Uso: node migrate-fix.js
 */

import { MongoClient } from "mongodb";
import { faker } from "@faker-js/faker";

const uri = "mongodb+srv://flexidrive9098:pabKgmiueWxx57TH@cluster0.j8jsbvb.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "flexidrive_fake";

faker.seed(20260313);

// ─── Coordenadas base reales por localidadId ─────────────────────────────────

const COORDS_POR_LOCALIDAD = {
  "14042170":   { lat: -32.4153, lng: -63.2439 }, // Villa María
  "14014010":   { lat: -31.4167, lng: -64.1833 }, // Córdoba
  "14182060":   { lat: -32.6333, lng: -62.6833 }, // Bell Ville
  "14098230":   { lat: -33.1307, lng: -64.3499 }, // Río Cuarto
  "82084270":   { lat: -32.9468, lng: -60.6393 }, // Rosario
  "82063170":   { lat: -31.6333, lng: -60.7000 }, // Santa Fe
  "82021310":   { lat: -31.2500, lng: -61.4833 }, // Rafaela
  "0644103015": { lat: -34.9205, lng: -57.9536 }, // La Plata
  "0635711003": { lat: -38.0023, lng: -57.5575 }, // Mar del Plata
  "0605601001": { lat: -38.7196, lng: -62.2724 }, // Bahía Blanca
};

const CALLES_POR_LOCALIDAD = {
  "14042170":   ["Av. Rivadavia", "Bv. Sarmiento", "Av. Baudrix", "Calle Mendoza", "Bv. España", "Calle 9 de Julio"],
  "14014010":   ["Av. Colón", "Bv. San Juan", "Av. Vélez Sársfield", "Calle Dean Funes", "Av. Gral. Paz", "Calle Obispo Trejo"],
  "14182060":   ["Av. San Martín", "Calle Urquiza", "Av. Rivadavia", "Calle Mitre", "Calle Belgrano"],
  "14098230":   ["Bv. Roca", "Av. Hipólito Yrigoyen", "Calle Sobremonte", "Av. Libertad", "Calle Tucumán"],
  "82084270":   ["Av. Pellegrini", "Bv. Oroño", "Calle Córdoba", "Av. San Martín", "Calle Santa Fe", "Av. Francia"],
  "82063170":   ["Av. Gral. López", "Calle San Jerónimo", "Av. Rivadavia", "Calle Tucumán", "Bv. Gálvez"],
  "82021310":   ["Av. Santa Fe", "Calle Belgrano", "Av. Matienzo", "Calle Mitre", "Av. Italia"],
  "0644103015": ["Av. 7", "Calle 13", "Av. 44", "Calle 51", "Av. 122", "Calle 32"],
  "0635711003": ["Av. Colón", "Bv. Marítimo", "Calle Salta", "Av. Independencia", "Calle Luro"],
  "0605601001": ["Av. Alem", "Calle Chiclana", "Av. Colón", "Calle Drago", "Bv. Fortín"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PREFIJOS_PATENTE = ["AA", "AB", "AC", "AD", "AE", "AF", "AG"];

function generarPatente() {
  const prefijo = faker.helpers.arrayElement(PREFIJOS_PATENTE);
  const numeros = faker.string.numeric(3);
  const sufijo  = faker.string.alpha({ length: 2, casing: "upper" });
  return `${prefijo}${numeros}${sufijo}`;
}

function generarNroEnvio() {
  const a = faker.string.numeric(4);
  const b = faker.string.numeric(4);
  return `FD-${a}-${b}`;
}

function coordsParaLocalidad(localidadId) {
  const base = COORDS_POR_LOCALIDAD[localidadId];
  if (!base) return null;
  return {
    lat: Number((base.lat + faker.number.float({ min: -0.015, max: 0.015, fractionDigits: 6 })).toFixed(6)),
    lng: Number((base.lng + faker.number.float({ min: -0.015, max: 0.015, fractionDigits: 6 })).toFixed(6)),
  };
}

function buildDireccion(localidadId, localidadNombre, provinciaNombre) {
  const calles = CALLES_POR_LOCALIDAD[localidadId] || ["Calle Sin Nombre"];
  const calle  = faker.helpers.arrayElement(calles);
  const numero = faker.number.int({ min: 100, max: 3000 });
  const coords = coordsParaLocalidad(localidadId);
  return {
    texto: `${calle} ${numero}, ${localidadNombre}, ${provinciaNombre}`,
    lat:   coords?.lat ?? null,
    lng:   coords?.lng ?? null,
  };
}

// Mapas de localidadId → nombre para reconstruir texto
const LOCALIDAD_NOMBRE = {
  "14042170":   { localidadNombre: "Villa María",    provinciaNombre: "Córdoba" },
  "14014010":   { localidadNombre: "Córdoba",         provinciaNombre: "Córdoba" },
  "14182060":   { localidadNombre: "Bell Ville",      provinciaNombre: "Córdoba" },
  "14098230":   { localidadNombre: "Río Cuarto",      provinciaNombre: "Córdoba" },
  "82084270":   { localidadNombre: "Rosario",         provinciaNombre: "Santa Fe" },
  "82063170":   { localidadNombre: "Santa Fe",        provinciaNombre: "Santa Fe" },
  "82021310":   { localidadNombre: "Rafaela",         provinciaNombre: "Santa Fe" },
  "0644103015": { localidadNombre: "La Plata",        provinciaNombre: "Buenos Aires" },
  "0635711003": { localidadNombre: "Mar del Plata",   provinciaNombre: "Buenos Aires" },
  "0605601001": { localidadNombre: "Bahía Blanca",    provinciaNombre: "Buenos Aires" },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function migrate() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Conectado a ${DB_NAME}\n`);

    // ── 1. Patentes ────────────────────────────────────────────────────────────
    console.log("1. Actualizando patentes de vehículos...");
    const vehiculos = await db.collection("vehiculos").find({}).toArray();
    let patenteCount = 0;

    for (const v of vehiculos) {
      const nuevaPatente = generarPatente();
      await db.collection("vehiculos").updateOne(
        { _id: v._id },
        { $set: { patente: nuevaPatente, updatedAt: new Date() } }
      );
      patenteCount++;
    }
    console.log(`   ✅ ${patenteCount} patentes actualizadas\n`);

    // ── 2. Números de envío ────────────────────────────────────────────────────
    console.log("2. Actualizando nro_envio en envíos...");
    const envios = await db.collection("envios").find({}).toArray();

    // Generar nros únicos
    const nuevosNros = new Set();
    while (nuevosNros.size < envios.length) {
      nuevosNros.add(generarNroEnvio());
    }
    const nrosArray = [...nuevosNros];

    let envioCount = 0;
    for (let i = 0; i < envios.length; i++) {
      const envio    = envios[i];
      const nuevoNro = nrosArray[i];

      // Actualizar el envío
      await db.collection("envios").updateOne(
        { _id: envio._id },
        { $set: { nro_envio: nuevoNro, updatedAt: new Date() } }
      );

      // Actualizar nro_envio en rutasOptimas (orden_entregas embebido)
      await db.collection("rutasOptimas").updateMany(
        { "orden_entregas.envioId": envio._id },
        { $set: { "orden_entregas.$[elem].nro_envio": nuevoNro } },
        { arrayFilters: [{ "elem.envioId": envio._id }] }
      );

      // Actualizar notificaciones que referencian este nro
      await db.collection("notificaciones").updateMany(
        { envioId: envio._id },
        { $set: { contenido: `El envío #${nuevoNro} tuvo una actualización.` } }
      );

      envioCount++;
    }
    console.log(`   ✅ ${envioCount} nros de envío actualizados\n`);

    // ── 3. Coordenadas y texto de direcciones en envíos ───────────────────────
    console.log("3. Actualizando coordenadas y textos de direcciones en envíos...");
    let coordCount = 0;

    for (const envio of envios) {
      const origenId  = envio.origenCiudad?.localidadId;
      const destinoId = envio.destinoCiudad?.localidadId;

      const origenInfo  = LOCALIDAD_NOMBRE[origenId];
      const destinoInfo = LOCALIDAD_NOMBRE[destinoId];

      if (!origenInfo || !destinoInfo) continue;

      const nuevaOrigen  = buildDireccion(origenId,  origenInfo.localidadNombre,  origenInfo.provinciaNombre);
      const nuevaDestino = buildDireccion(destinoId, destinoInfo.localidadNombre, destinoInfo.provinciaNombre);

      await db.collection("envios").updateOne(
        { _id: envio._id },
        {
          $set: {
            direccion_origen:  nuevaOrigen,
            direccion_destino: nuevaDestino,
            updatedAt:         new Date(),
          },
        }
      );
      coordCount++;
    }
    console.log(`   ✅ ${coordCount} direcciones de envíos actualizadas\n`);

    // ── 4. Coordenadas en destinatarios ───────────────────────────────────────
    console.log("4. Actualizando coordenadas de destinatarios...");
    const destinatarios = await db.collection("destinatarios").find({}).toArray();
    let destCount = 0;

    for (const dest of destinatarios) {
      const localidadId = dest.localidad?.localidadId;
      const info        = LOCALIDAD_NOMBRE[localidadId];
      if (!info) continue;

      const dir = buildDireccion(localidadId, info.localidadNombre, info.provinciaNombre);

      await db.collection("destinatarios").updateOne(
        { _id: dest._id },
        {
          $set: {
            direccion:  dir.texto,
            lat:        dir.lat,
            lng:        dir.lng,
            updatedAt:  new Date(),
          },
        }
      );
      destCount++;
    }
    console.log(`   ✅ ${destCount} destinatarios actualizados\n`);

    // ── 5. Coordenadas en direccionfrecuentes ─────────────────────────────────
    console.log("5. Actualizando coordenadas de direcciones frecuentes...");
    const frecuentes = await db.collection("direccionfrecuentes").find({}).toArray();
    let frecCount = 0;

    for (const dir of frecuentes) {
      const localidadId = dir.localidad?.localidadId;
      const info        = LOCALIDAD_NOMBRE[localidadId];
      if (!info) continue;

      const nueva = buildDireccion(localidadId, info.localidadNombre, info.provinciaNombre);

      await db.collection("direccionfrecuentes").updateOne(
        { _id: dir._id },
        {
          $set: {
            direccion: nueva.texto,
            lat:       nueva.lat,
            lng:       nueva.lng,
            updatedAt: new Date(),
          },
        }
      );
      frecCount++;
    }
    console.log(`   ✅ ${frecCount} direcciones frecuentes actualizadas\n`);

    // ── 6. Coordenadas en rutasOptimas (orden_entregas) ───────────────────────
    console.log("6. Actualizando coordenadas en rutas óptimas...");

    // Reconstruir mapa envioId → nuevas direcciones desde la DB ya actualizada
    const enviosActualizados = await db.collection("envios")
      .find({}, { projection: { _id: 1, direccion_origen: 1, direccion_destino: 1 } })
      .toArray();

    const mapEnvio = Object.fromEntries(
      enviosActualizados.map((e) => [String(e._id), e])
    );

    const rutas = await db.collection("rutasOptimas").find({}).toArray();
    let rutaCount = 0;

    for (const ruta of rutas) {
      if (!Array.isArray(ruta.orden_entregas)) continue;

      const nuevasParadas = ruta.orden_entregas.map((parada) => {
        const envio = mapEnvio[String(parada.envioId)];
        if (!envio) return parada;

        if (parada.tipo === "RETIRO" && envio.direccion_origen) {
          return {
            ...parada,
            lat:   envio.direccion_origen.lat,
            lng:   envio.direccion_origen.lng,
            texto: envio.direccion_origen.texto,
          };
        }
        if (parada.tipo === "ENTREGA" && envio.direccion_destino) {
          return {
            ...parada,
            lat:   envio.direccion_destino.lat,
            lng:   envio.direccion_destino.lng,
            texto: envio.direccion_destino.texto,
          };
        }
        return parada;
      });

      await db.collection("rutasOptimas").updateOne(
        { _id: ruta._id },
        { $set: { orden_entregas: nuevasParadas, updatedAt: new Date() } }
      );
      rutaCount++;
    }
    console.log(`   ✅ ${rutaCount} rutas óptimas actualizadas\n`);

    console.log("✅ Migración completada sin borrar datos.");
  } catch (err) {
    console.error("❌ Error en migración:", err);
  } finally {
    await client.close();
  }
}

migrate();
