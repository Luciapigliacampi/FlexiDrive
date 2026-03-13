/**
 * seed-envios-pendientes.js
 *
 * Agrega 15 envíos en estado PENDIENTE con fecha de entrega 4/3 y 5/3 de 2026.
 * NO borra nada existente — solo inserta.
 *
 * Uso: node seed-envios-pendientes.js
 */

import { MongoClient, ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";

const uri = "mongodb+srv://flexidrive9098:pabKgmiueWxx57TH@cluster0.j8jsbvb.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "flexidrive_fake";

faker.seed(20260315);

const CLIENTES = [
  { _id: new ObjectId("69b3f9c4e309edbceec834eb") },
  { _id: new ObjectId("69b3f9c4e309edbceec834ea") },
  { _id: new ObjectId("69b3f9c4e309edbceec834ee") },
];

const COMISIONISTAS = [
  {
    _id:        new ObjectId("69b40aa872d3b2f8c1acabba"),
    tripPlanId: new ObjectId("69b40c76e1c66dc2ea301c2f"),
    vehiculoId: new ObjectId("69b40bfacbbd8df75a13ba45"),
    origen: { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14042170", localidadNombre: "Villa María" },
    destinos: [
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "1401401003", localidadNombre: "Córdoba",   precio: 1500 },
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14042150",   localidadNombre: "Tío Pujio", precio: 700  },
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14161110",   localidadNombre: "Oliva",     precio: 1200 },
    ],
  },
  {
    _id:        new ObjectId("69b3f9cae309edbceec83564"),
    tripPlanId: new ObjectId("69b3fbece76dc6a44bea94d0"),
    vehiculoId: new ObjectId("69b3f9cce309edbceec83645"),
    origen: { provinciaId: "82", provinciaNombre: "Santa Fe", localidadId: "82084270", localidadNombre: "Rosario" },
    destinos: [
      { provinciaId: "14", provinciaNombre: "Córdoba",    localidadId: "1401401003", localidadNombre: "Córdoba",          precio: 10000 },
      { provinciaId: "14", provinciaNombre: "Córdoba",    localidadId: "14042170",   localidadNombre: "Villa María",      precio: 5000  },
      { provinciaId: "14", provinciaNombre: "Córdoba",    localidadId: "14182060",   localidadNombre: "Bell Ville",       precio: 2000  },
      { provinciaId: "14", provinciaNombre: "Córdoba",    localidadId: "14042150",   localidadNombre: "Tío Pujio",        precio: 6000  },
      { provinciaId: "14", provinciaNombre: "Córdoba",    localidadId: "14161110",   localidadNombre: "Oliva",            precio: 7000  },
      { provinciaId: "82", provinciaNombre: "Santa Fe",   localidadId: "82056030",   localidadNombre: "Cañada de Gómez", precio: 2000  },
    ],
  },
];

const COORDS = {
  "14042170":   { lat: -32.4153, lng: -63.2439 },
  "1401401003": { lat: -31.4167, lng: -64.1833 },
  "14042150":   { lat: -32.3667, lng: -63.4167 },
  "14161110":   { lat: -32.0333, lng: -63.5667 },
  "14182060":   { lat: -32.6333, lng: -62.6833 },
  "82084270":   { lat: -32.9468, lng: -60.6393 },
  "82056030":   { lat: -32.8167, lng: -61.3833 },
};

const CALLES = {
  "14042170":   ["Av. Rivadavia", "Bv. Sarmiento", "Av. Baudrix", "Calle Mendoza", "Bv. España"],
  "1401401003": ["Av. Colón", "Bv. San Juan", "Av. Vélez Sársfield", "Calle Dean Funes", "Av. Gral. Paz"],
  "14042150":   ["Calle San Martín", "Calle Belgrano", "Calle Mitre", "Av. Libertad"],
  "14161110":   ["Calle San Martín", "Av. Rivadavia", "Calle Urquiza", "Calle Mitre"],
  "14182060":   ["Av. San Martín", "Calle Urquiza", "Calle Mitre", "Calle Belgrano"],
  "82084270":   ["Av. Pellegrini", "Bv. Oroño", "Calle Córdoba", "Av. San Martín", "Calle Santa Fe"],
  "82056030":   ["Calle San Martín", "Av. Rivadavia", "Calle Mitre", "Calle Belgrano"],
};

const FRANJAS = ["08:00-12:00", "13:00-17:00", "17:00-20:00"];

// Fechas de entrega: 4/3/2026 y 5/3/2026
const FECHAS_ENTREGA = [
  new Date("2026-03-04T12:00:00.000Z"),
  new Date("2026-03-05T12:00:00.000Z"),
];

// Fecha de creación: unos días antes (1/3 y 2/3)
const FECHAS_CREACION = [
  new Date("2026-03-01T10:00:00.000Z"),
  new Date("2026-03-02T10:00:00.000Z"),
  new Date("2026-03-03T10:00:00.000Z"),
];

function buildDir(localidadId, localidadNombre, provinciaNombre) {
  const calles = CALLES[localidadId] || ["Calle San Martín"];
  const calle  = faker.helpers.arrayElement(calles);
  const numero = faker.number.int({ min: 100, max: 3000 });
  const base   = COORDS[localidadId] || { lat: -32.4, lng: -63.2 };
  return {
    texto: `${calle} ${numero}, ${localidadNombre}, ${provinciaNombre}`,
    lat: Number((base.lat + faker.number.float({ min: -0.012, max: 0.012, fractionDigits: 6 })).toFixed(6)),
    lng: Number((base.lng + faker.number.float({ min: -0.012, max: 0.012, fractionDigits: 6 })).toFixed(6)),
  };
}

function generarNroEnvio() {
  return `FD-${faker.string.numeric(4)}-${faker.string.numeric(4)}`;
}

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Conectado a ${DB_NAME}\n`);

    // Generar nros únicos
    const nrosSet = new Set();
    while (nrosSet.size < 15) nrosSet.add(generarNroEnvio());
    const nros = [...nrosSet];

    const enviosToInsert      = [];
    const notificacionesList  = [];

    for (let i = 0; i < 15; i++) {
      const _id          = new ObjectId();
      const cliente      = faker.helpers.arrayElement(CLIENTES);
      const comisionista = faker.helpers.arrayElement(COMISIONISTAS);
      const destino      = faker.helpers.arrayElement(comisionista.destinos);
      const nroEnvio     = nros[i];
      const fechaEntrega = faker.helpers.arrayElement(FECHAS_ENTREGA);
      const fechaCreacion = faker.helpers.arrayElement(FECHAS_CREACION);
      const cantPaquetes = faker.number.int({ min: 1, max: 3 });

      const dirOrigen  = buildDir(
        comisionista.origen.localidadId,
        comisionista.origen.localidadNombre,
        comisionista.origen.provinciaNombre,
      );
      const dirDestino = buildDir(
        destino.localidadId,
        destino.localidadNombre,
        destino.provinciaNombre,
      );

      const paquetes = Array.from({ length: cantPaquetes }, (_, pi) => ({
        alto:           faker.number.int({ min: 10, max: 60 }),
        ancho:          faker.number.int({ min: 10, max: 60 }),
        profundidad:    faker.number.int({ min: 5,  max: 50 }),
        peso:           Number(faker.number.float({ min: 0.3, max: 15, fractionDigits: 1 })),
        contenido:      faker.helpers.arrayElement(["Ropa", "Documentación", "Regalo", "Electrónica", "Accesorios"]),
        fragil:         faker.datatype.boolean(0.2),
        codigo_paquete: `B-${nroEnvio}-${pi + 1}`,
        clienteId:      cliente._id,
      }));

      enviosToInsert.push({
        _id,
        usuarioId:             cliente._id,
        comisionistaId:        null,
        destinatarioId:        null,
        nro_envio:             nroEnvio,
        direccion_origen:      dirOrigen,
        direccion_destino:     dirDestino,
        origenCiudad: {
          localidadId:     comisionista.origen.localidadId,
          localidadNombre: comisionista.origen.localidadNombre,
        },
        destinoCiudad: {
          localidadId:     destino.localidadId,
          localidadNombre: destino.localidadNombre,
        },
        paquetes,
        costo_estimado:        destino.precio * cantPaquetes,
        fecha_entrega:         fechaEntrega,
        franja_horaria_retiro: faker.helpers.arrayElement(FRANJAS),
        fecha_retiro:          null,
        estadoId:              "PENDIENTE",
        tripPlanId:            null,
        notas_adicionales:     faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) || "",
        polyline_especifica:   "",
        archivado:             false,
        eliminado:             false,
        createdAt:             fechaCreacion,
        updatedAt:             new Date(),
      });

      notificacionesList.push({
        _id:       new ObjectId(),
        userId:    cliente._id,
        rol:       "cliente",
        tipo:      "ESTADO_ACTUALIZADO",
        titulo:    "Envío creado",
        contenido: `Tu envío #${nroEnvio} fue creado y está esperando un comisionista.`,
        leida:     false,
        visible:   true,
        envioId:   _id,
        createdAt: fechaCreacion,
        updatedAt: new Date(),
      });
    }

    await db.collection("envios").insertMany(enviosToInsert);
    console.log(`✅ ${enviosToInsert.length} envíos PENDIENTES insertados`);
    console.log(`   - Con fecha de entrega 4/3/2026: ${enviosToInsert.filter(e => e.fecha_entrega.getTime() === FECHAS_ENTREGA[0].getTime()).length}`);
    console.log(`   - Con fecha de entrega 5/3/2026: ${enviosToInsert.filter(e => e.fecha_entrega.getTime() === FECHAS_ENTREGA[1].getTime()).length}`);

    await db.collection("notificaciones").insertMany(notificacionesList);
    console.log(`✅ ${notificacionesList.length} notificaciones insertadas`);

    console.log("\n✅ Listo. Sin tocar datos existentes.");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();
