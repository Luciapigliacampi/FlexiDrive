/**
 * seed-envios-historicos.js
 *
 * Inserta 40 envíos (20 por comisionista), distribuidos entre 3 clientes.
 *
 * Regla de estado:
 *   - fecha_entrega < hoy  → ENTREGADO (60%), CANCELADO (25%), DEVUELTO (15%)
 *   - fecha_entrega >= hoy → PENDIENTE (70%), CANCELADO (30%)
 *
 * Todas las fechas como objetos Date nativos → MongoDB los guarda como ISODate.
 * NO borra nada existente — solo inserta.
 *
 * Uso: node seed-envios-historicos.js
 */

import { MongoClient, ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";

const uri     = "mongodb+srv://flexidrive9098:pabKgmiueWxx57TH@cluster0.j8jsbvb.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "flexidrive_fake";

faker.seed(20260317);

// ─── Usuarios ────────────────────────────────────────────────────────────────

const CLIENTES = [
  { _id: new ObjectId("69b3f9c4e309edbceec834eb"), nombre: "Lorenz",  apellido: "Johnson"  },
  { _id: new ObjectId("69b3f9c4e309edbceec834ea"), nombre: "Brionna", apellido: "Donnelly" },
  { _id: new ObjectId("69b3f9c4e309edbceec834ee"), nombre: "Nelson",  apellido: "Bednar"   },
];

const COMISIONISTAS = [
  {
    _id:        new ObjectId("69b40aa872d3b2f8c1acabba"),
    tripPlanId: new ObjectId("69b40c76e1c66dc2ea301c2f"),
    vehiculoId: new ObjectId("69b40bfacbbd8df75a13ba45"),
    origen: { provinciaId: "14", provinciaNombre: "Córdoba",  localidadId: "14042170",   localidadNombre: "Villa María" },
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
    origen: { provinciaId: "82", provinciaNombre: "Santa Fe", localidadId: "82084270",   localidadNombre: "Rosario" },
    destinos: [
      { provinciaId: "14", provinciaNombre: "Córdoba",  localidadId: "1401401003", localidadNombre: "Córdoba",          precio: 10000 },
      { provinciaId: "14", provinciaNombre: "Córdoba",  localidadId: "14042170",   localidadNombre: "Villa María",      precio: 5000  },
      { provinciaId: "14", provinciaNombre: "Córdoba",  localidadId: "14182060",   localidadNombre: "Bell Ville",       precio: 2000  },
      { provinciaId: "14", provinciaNombre: "Córdoba",  localidadId: "14063160",   localidadNombre: "Leones",           precio: 2000  },
      { provinciaId: "14", provinciaNombre: "Córdoba",  localidadId: "14042150",   localidadNombre: "Tío Pujio",        precio: 6000  },
      { provinciaId: "14", provinciaNombre: "Córdoba",  localidadId: "14161110",   localidadNombre: "Oliva",            precio: 7000  },
      { provinciaId: "82", provinciaNombre: "Santa Fe", localidadId: "82056030",   localidadNombre: "Cañada de Gómez", precio: 2000  },
    ],
  },
];

// ─── Coordenadas base y calles ────────────────────────────────────────────────

const COORDS = {
  "14042170":   { lat: -32.4153, lng: -63.2439 },
  "1401401003": { lat: -31.4167, lng: -64.1833 },
  "14042150":   { lat: -32.3667, lng: -63.4167 },
  "14161110":   { lat: -32.0333, lng: -63.5667 },
  "14182060":   { lat: -32.6333, lng: -62.6833 },
  "14063160":   { lat: -32.6500, lng: -62.2833 },
  "82084270":   { lat: -32.9468, lng: -60.6393 },
  "82056030":   { lat: -32.8167, lng: -61.3833 },
};

const CALLES = {
  "14042170":   ["Av. Rivadavia", "Bv. Sarmiento", "Av. Baudrix", "Calle Mendoza", "Bv. España"],
  "1401401003": ["Av. Colón", "Bv. San Juan", "Av. Vélez Sársfield", "Calle Dean Funes", "Av. Gral. Paz"],
  "14042150":   ["Calle San Martín", "Calle Belgrano", "Calle Mitre", "Av. Libertad"],
  "14161110":   ["Calle San Martín", "Av. Rivadavia", "Calle Urquiza", "Calle Mitre"],
  "14182060":   ["Av. San Martín", "Calle Urquiza", "Calle Mitre", "Calle Belgrano"],
  "14063160":   ["Calle San Martín", "Calle Mitre", "Calle Belgrano", "Av. Libertad"],
  "82084270":   ["Av. Pellegrini", "Bv. Oroño", "Calle Córdoba", "Av. San Martín", "Calle Santa Fe"],
  "82056030":   ["Calle San Martín", "Av. Rivadavia", "Calle Mitre", "Calle Belgrano"],
};

const FRANJAS = ["08:00-12:00", "13:00-17:00", "17:00-20:00"];

// ─── Distribuciones de estado ─────────────────────────────────────────────────

const ESTADOS_PASADOS = [
  { weight: 60, value: "ENTREGADO" },
  { weight: 25, value: "CANCELADO" },
  { weight: 15, value: "DEVUELTO"  },
];

const ESTADOS_FUTUROS = [
  { weight: 70, value: "PENDIENTE" },
  { weight: 30, value: "CANCELADO" },
];

// ─── Fechas ───────────────────────────────────────────────────────────────────

const HOY = new Date("2026-03-13T00:00:00.000Z");

// 14 pasados por comisionista: creación entre sept/2025 y 12/3/2026
const DESDE_PASADO = new Date("2025-09-01T00:00:00.000Z");
const HASTA_PASADO = new Date("2026-03-10T23:59:59.000Z"); // creación máx 10/3 → entrega cae antes del 13/3

// 6 futuros por comisionista: creación a partir de hoy
const DESDE_FUTURO = new Date("2026-03-13T00:00:00.000Z");
const HASTA_FUTURO = new Date("2026-03-20T23:59:59.000Z");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Garantiza objeto Date nativo (MongoDB ISODate) */
function iso(d) {
  return new Date(d instanceof Date ? d.toISOString() : d);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

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

// ─── Constantes de cantidad ───────────────────────────────────────────────────

const POR_COMISIONISTA = 20;
const PASADOS_POR_COM  = 14;
const FUTUROS_POR_COM  = 6;
const TOTAL            = COMISIONISTAS.length * POR_COMISIONISTA; // 40

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Conectado a ${DB_NAME}\n`);

    // Evitar nro_envio duplicados
    const existentes    = await db.collection("envios").find({}, { projection: { nro_envio: 1 } }).toArray();
    const nrosExistentes = new Set(existentes.map((e) => e.nro_envio));

    const nrosSet = new Set();
    while (nrosSet.size < TOTAL) {
      const c = generarNroEnvio();
      if (!nrosExistentes.has(c)) nrosSet.add(c);
    }
    const nros = [...nrosSet];
    let nroIdx = 0;

    const enviosToInsert         = [];
    const envioXComisionistaList = [];
    const notificacionesList     = [];

    for (const comisionista of COMISIONISTAS) {
      for (let i = 0; i < POR_COMISIONISTA; i++) {
        const esPasado = i < PASADOS_POR_COM;

        const _id      = new ObjectId();
        const cliente  = CLIENTES[i % CLIENTES.length];
        const destino  = faker.helpers.arrayElement(comisionista.destinos);
        const nroEnvio = nros[nroIdx++];

        // ── Fechas ────────────────────────────────────────────────────────────
        let fechaCreacion, fechaEntrega;

        if (esPasado) {
          // Creación en el pasado; entrega = creación + 1..4 días (siempre < hoy)
          fechaCreacion = iso(faker.date.between({ from: DESDE_PASADO, to: HASTA_PASADO }));
          fechaEntrega  = iso(addDays(fechaCreacion, faker.number.int({ min: 1, max: 3 })));
          // Asegurar que fechaEntrega quede antes de hoy
          if (fechaEntrega >= HOY) fechaEntrega = iso(addDays(HOY, -1));
        } else {
          // Creación hoy o prox. días; entrega = hoy + 0..30 días (>= hoy)
          fechaCreacion = iso(faker.date.between({ from: DESDE_FUTURO, to: HASTA_FUTURO }));
          fechaEntrega  = iso(addDays(HOY, faker.number.int({ min: 0, max: 30 })));
        }

        // ── Estado ────────────────────────────────────────────────────────────
        const estadoId = esPasado
          ? faker.helpers.weightedArrayElement(ESTADOS_PASADOS)
          : faker.helpers.weightedArrayElement(ESTADOS_FUTUROS);

        const cantPaquetes = faker.number.int({ min: 1, max: 4 });
        const dirOrigen    = buildDir(comisionista.origen.localidadId, comisionista.origen.localidadNombre, comisionista.origen.provinciaNombre);
        const dirDestino   = buildDir(destino.localidadId, destino.localidadNombre, destino.provinciaNombre);

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

        // Fechas de proceso (solo pasados no cancelados)
        const fechaRetiro = (esPasado && estadoId !== "CANCELADO")
          ? iso(addDays(fechaCreacion, faker.number.int({ min: 0, max: 1 })))
          : null;
        const fechaInicio = (esPasado && estadoId !== "CANCELADO")
          ? iso(addDays(fechaCreacion, faker.number.int({ min: 1, max: 2 })))
          : null;
        const fechaFin = esPasado
          ? iso(addDays(fechaCreacion, faker.number.int({ min: 2, max: 5 })))
          : null;

        const updatedAt = fechaFin ?? fechaCreacion;

        // ── Envío ─────────────────────────────────────────────────────────────
        enviosToInsert.push({
          _id,
          usuarioId:             cliente._id,
          comisionistaId:        comisionista._id,
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
          fecha_retiro:          fechaRetiro,
          estadoId,
          tripPlanId:            comisionista.tripPlanId,
          notas_adicionales:     faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.25 }) || "",
          polyline_especifica:   "",
          archivado:             esPasado,
          eliminado:             false,
          createdAt:             fechaCreacion,
          updatedAt:             iso(updatedAt),
        });

        // ── envioXComisionista ─────────────────────────────────────────────────
        envioXComisionistaList.push({
          _id:                 new ObjectId(),
          comisionistaId:      comisionista._id,
          envioId:             _id,
          vehiculoId:          comisionista.vehiculoId,
          tripPlanId:          comisionista.tripPlanId,
          precio_final:        destino.precio * cantPaquetes,
          fecha_asignacion:    fechaCreacion,
          fecha_inicio_retiro: fechaRetiro,
          fecha_retiro:        fechaRetiro,
          fecha_demora:        null,
          fecha_inicio:        fechaInicio,
          fecha_fin:           fechaFin,
          distanciaKm:         (esPasado && estadoId !== "CANCELADO")
            ? Number(faker.number.float({ min: 5, max: 300, fractionDigits: 1 }))
            : null,
          estado_id:           estadoId,
          createdAt:           fechaCreacion,
          updatedAt:           iso(updatedAt),
        });

        // ── Notificación al comisionista ───────────────────────────────────────
        notificacionesList.push({
          _id:       new ObjectId(),
          userId:    comisionista._id,
          rol:       "comisionista",
          tipo:      "NUEVO_ENVIO_DISPONIBLE",
          titulo:    "Nuevo envío asignado",
          contenido: `Tenés un nuevo envío #${nroEnvio} para ${destino.localidadNombre}.`,
          leida:     esPasado,
          visible:   true,
          envioId:   _id,
          createdAt: fechaCreacion,
          updatedAt: fechaCreacion,
        });

        // ── Notificación al cliente (solo pasados con estado final) ────────────
        if (esPasado) {
          const tipoCliente =
            estadoId === "ENTREGADO" ? "ESTADO_ACTUALIZADO" :
            estadoId === "CANCELADO" ? "ENVIO_CANCELADO_POR_COMISIONISTA" :
                                       "ESTADO_ACTUALIZADO"; // DEVUELTO

          const tituloCliente =
            estadoId === "ENTREGADO" ? "Envío entregado" :
            estadoId === "CANCELADO" ? "Envío cancelado" :
                                       "Envío devuelto";

          const contenidoCliente =
            estadoId === "ENTREGADO" ? `Tu envío #${nroEnvio} fue entregado exitosamente.` :
            estadoId === "CANCELADO" ? `Tu envío #${nroEnvio} fue cancelado.` :
                                       `Tu envío #${nroEnvio} fue devuelto al origen.`;

          const fechaNotif = iso(fechaFin ?? fechaCreacion);
          notificacionesList.push({
            _id:       new ObjectId(),
            userId:    cliente._id,
            rol:       "cliente",
            tipo:      tipoCliente,
            titulo:    tituloCliente,
            contenido: contenidoCliente,
            leida:     true,
            visible:   true,
            envioId:   _id,
            createdAt: fechaNotif,
            updatedAt: fechaNotif,
          });
        }
      }
    }

    // ── Insertar ──────────────────────────────────────────────────────────────
    await db.collection("envios").insertMany(enviosToInsert);
    console.log(`✅ ${enviosToInsert.length} envíos insertados`);

    const resumen = enviosToInsert.reduce((acc, e) => {
      const tipo = e.archivado ? `${e.estadoId} (pasado)` : `${e.estadoId} (futuro)`;
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});
    Object.entries(resumen).sort().forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    await db.collection("envioXComisionista").insertMany(envioXComisionistaList);
    console.log(`\n✅ ${envioXComisionistaList.length} registros envioXComisionista insertados`);

    await db.collection("notificaciones").insertMany(notificacionesList);
    console.log(`✅ ${notificacionesList.length} notificaciones insertadas`);

    console.log("\n✅ Seed completado sin tocar datos existentes.");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();
