/**
 * seed-envios-especificos.js
 *
 * Agrega ~10 envíos por cliente entre los clientes y comisionistas indicados.
 * NO borra nada existente — solo inserta nuevos documentos.
 *
 * Uso: node seed-envios-especificos.js
 */

import { MongoClient, ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";

const uri = "mongodb+srv://flexidrive9098:pabKgmiueWxx57TH@cluster0.j8jsbvb.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "flexidrive_fake";

faker.seed(20260314);

// ─── IDs de los usuarios involucrados ────────────────────────────────────────

const CLIENTES = [
  { _id: new ObjectId("69b3f9c4e309edbceec834eb"), nombre: "Lorenz",  apellido: "Johnson" },
  { _id: new ObjectId("69b3f9c4e309edbceec834ea"), nombre: "Brionna", apellido: "Donnelly" },
  { _id: new ObjectId("69b3f9c4e309edbceec834ee"), nombre: "Nelson",  apellido: "Bednar" },
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
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "1401401003", localidadNombre: "Córdoba",          precio: 10000 },
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14042170",   localidadNombre: "Villa María",      precio: 5000  },
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14182060",   localidadNombre: "Bell Ville",       precio: 2000  },
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14063160",   localidadNombre: "Leones",           precio: 2000  },
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14042150",   localidadNombre: "Tío Pujio",        precio: 6000  },
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14161110",   localidadNombre: "Oliva",            precio: 7000  },
      { provinciaId: "82", provinciaNombre: "Santa Fe", localidadId: "82056030",  localidadNombre: "Cañada de Gómez", precio: 2000  },
    ],
  },
];

// ─── Coordenadas reales por localidadId ──────────────────────────────────────

const COORDS = {
  "14042170":   { lat: -32.4153, lng: -63.2439 },
  "14014010":   { lat: -31.4167, lng: -64.1833 },
  "1401401003": { lat: -31.4167, lng: -64.1833 }, // Córdoba ciudad
  "14042150":   { lat: -32.3667, lng: -63.4167 }, // Tío Pujio
  "14161110":   { lat: -32.0333, lng: -63.5667 }, // Oliva
  "14182060":   { lat: -32.6333, lng: -62.6833 },
  "14063160":   { lat: -32.6500, lng: -62.2833 }, // Leones
  "82084270":   { lat: -32.9468, lng: -60.6393 },
  "82056030":   { lat: -32.8167, lng: -61.3833 }, // Cañada de Gómez
};

const CALLES = {
  "14042170":   ["Av. Rivadavia", "Bv. Sarmiento", "Av. Baudrix", "Calle Mendoza", "Bv. España"],
  "14014010":   ["Av. Colón", "Bv. San Juan", "Av. Vélez Sársfield", "Calle Dean Funes", "Av. Gral. Paz"],
  "1401401003": ["Av. Colón", "Bv. San Juan", "Av. Vélez Sársfield", "Calle Dean Funes", "Av. Gral. Paz"],
  "14042150":   ["Calle San Martín", "Calle Belgrano", "Calle Mitre", "Av. Libertad"],
  "14161110":   ["Calle San Martín", "Av. Rivadavia", "Calle Urquiza", "Calle Mitre"],
  "14182060":   ["Av. San Martín", "Calle Urquiza", "Calle Mitre", "Calle Belgrano"],
  "14063160":   ["Calle San Martín", "Calle Mitre", "Calle Belgrano", "Av. Libertad"],
  "82084270":   ["Av. Pellegrini", "Bv. Oroño", "Calle Córdoba", "Av. San Martín", "Calle Santa Fe"],
  "82056030":   ["Calle San Martín", "Av. Rivadavia", "Calle Mitre", "Calle Belgrano"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function coords(localidadId) {
  const base = COORDS[localidadId];
  if (!base) return { lat: -32.4, lng: -63.2 };
  return {
    lat: Number((base.lat + faker.number.float({ min: -0.012, max: 0.012, fractionDigits: 6 })).toFixed(6)),
    lng: Number((base.lng + faker.number.float({ min: -0.012, max: 0.012, fractionDigits: 6 })).toFixed(6)),
  };
}

function buildDir(localidadId, localidadNombre, provinciaNombre) {
  const calles = CALLES[localidadId] || ["Calle San Martín"];
  const calle  = faker.helpers.arrayElement(calles);
  const numero = faker.number.int({ min: 100, max: 3000 });
  const c      = coords(localidadId);
  return {
    texto: `${calle} ${numero}, ${localidadNombre}, ${provinciaNombre}`,
    lat:   c.lat,
    lng:   c.lng,
  };
}

function generarNroEnvio() {
  return `FD-${faker.string.numeric(4)}-${faker.string.numeric(4)}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function randomPastDate(daysBack = 30) {
  const to   = new Date();
  const from = new Date();
  from.setDate(to.getDate() - daysBack);
  return faker.date.between({ from, to });
}

const FRANJAS = ["08:00-12:00", "13:00-17:00", "17:00-20:00"];

const ESTADOS_PESO = [
  { weight: 10, value: "PENDIENTE"  },
  { weight: 15, value: "ASIGNADO"   },
  { weight: 10, value: "EN_RETIRO"  },
  { weight: 10, value: "RETIRADO"   },
  { weight: 15, value: "EN_CAMINO"  },
  { weight: 40, value: "ENTREGADO"  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Conectado a ${DB_NAME}\n`);

    const enviosToInsert         = [];
    const envioXComisionistaList = [];
    const notificacionesList     = [];

    // Generar nros únicos para todos los envíos
    const totalEnvios = CLIENTES.length * 10;
    const nrosSet     = new Set();
    while (nrosSet.size < totalEnvios) nrosSet.add(generarNroEnvio());
    const nros = [...nrosSet];
    let nroIdx = 0;

    for (const cliente of CLIENTES) {
      console.log(`Generando envíos para ${cliente.nombre} ${cliente.apellido}...`);

      for (let i = 0; i < 10; i++) {
        const _id           = new ObjectId();
        const comisionista  = faker.helpers.arrayElement(COMISIONISTAS);
        const destino       = faker.helpers.arrayElement(comisionista.destinos);
        const estadoId      = faker.helpers.weightedArrayElement(ESTADOS_PESO);
        const fechaBase     = randomPastDate(25);
        const nroEnvio      = nros[nroIdx++];
        const asignado      = estadoId !== "PENDIENTE";

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

        const cantPaquetes = faker.number.int({ min: 1, max: 3 });
        const paquetes     = Array.from({ length: cantPaquetes }, (_, pi) => ({
          alto:           faker.number.int({ min: 10, max: 60 }),
          ancho:          faker.number.int({ min: 10, max: 60 }),
          profundidad:    faker.number.int({ min: 5,  max: 50 }),
          peso:           Number(faker.number.float({ min: 0.3, max: 15, fractionDigits: 1 })),
          contenido:      faker.helpers.arrayElement(["Ropa", "Documentación", "Regalo", "Electrónica", "Accesorios"]),
          fragil:         faker.datatype.boolean(0.2),
          codigo_paquete: `B-${nroEnvio}-${pi + 1}`,
          clienteId:      cliente._id,
        }));

        const fechaRetiro =
          ["RETIRADO", "EN_CAMINO", "ENTREGADO"].includes(estadoId)
            ? addDays(fechaBase, faker.number.int({ min: 0, max: 1 }))
            : null;

        const envio = {
          _id,
          usuarioId:             cliente._id,
          comisionistaId:        asignado ? comisionista._id : null,
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
          fecha_entrega:         addDays(fechaBase, faker.number.int({ min: 1, max: 4 })),
          franja_horaria_retiro: faker.helpers.arrayElement(FRANJAS),
          fecha_retiro:          fechaRetiro,
          estadoId,
          tripPlanId:            asignado ? comisionista.tripPlanId : null,
          notas_adicionales:     faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) || "",
          polyline_especifica:   "",
          archivado:             false,
          eliminado:             false,
          createdAt:             fechaBase,
          updatedAt:             new Date(),
        };

        enviosToInsert.push(envio);

        // EnvioXComisionista
        if (asignado) {
          envioXComisionistaList.push({
            _id:             new ObjectId(),
            comisionistaId:  comisionista._id,
            envioId:         _id,
            vehiculoId:      comisionista.vehiculoId,
            tripPlanId:      comisionista.tripPlanId,
            precio_final:    envio.costo_estimado,
            fecha_asignacion: addDays(fechaBase, 0),
            fecha_inicio_retiro: ["EN_RETIRO", "RETIRADO", "EN_CAMINO", "ENTREGADO"].includes(estadoId)
              ? addDays(fechaBase, 0) : null,
            fecha_retiro:    fechaRetiro,
            fecha_demora:    null,
            fecha_inicio:    ["EN_CAMINO", "ENTREGADO"].includes(estadoId)
              ? addDays(fechaBase, faker.number.int({ min: 1, max: 2 })) : null,
            fecha_fin:       estadoId === "ENTREGADO"
              ? addDays(fechaBase, faker.number.int({ min: 2, max: 4 })) : null,
            distanciaKm:     Number(faker.number.float({ min: 5, max: 250, fractionDigits: 1 })),
            estado_id:       estadoId === "RETIRADO" ? "EN_CAMINO" : estadoId,
            createdAt:       fechaBase,
            updatedAt:       new Date(),
          });
        }

        // Notificación para el cliente
        notificacionesList.push({
          _id:      new ObjectId(),
          userId:   cliente._id,
          rol:      "cliente",
          tipo:     asignado ? "ENVIO_ACEPTADO" : "ESTADO_ACTUALIZADO",
          titulo:   asignado ? "Tu envío fue aceptado" : "Actualización de tu envío",
          contenido: `El envío #${nroEnvio} tuvo una actualización.`,
          leida:    faker.datatype.boolean(0.4),
          visible:  true,
          envioId:  _id,
          createdAt: fechaBase,
          updatedAt: new Date(),
        });
      }
    }

    console.log("\nInsertando en la base de datos...");
    await db.collection("envios").insertMany(enviosToInsert);
    console.log(`   ✅ ${enviosToInsert.length} envíos insertados`);

    await db.collection("envioXComisionista").insertMany(envioXComisionistaList);
    console.log(`   ✅ ${envioXComisionistaList.length} registros envioXComisionista insertados`);

    await db.collection("notificaciones").insertMany(notificacionesList);
    console.log(`   ✅ ${notificacionesList.length} notificaciones insertadas`);

    console.log("\n✅ Listo. Envíos agregados sin tocar datos existentes.");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();
