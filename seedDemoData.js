import { MongoClient, ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";

const uri =
  "mongodb+srv://flexidrive9098:pabKgmiueWxx57TH@cluster0.j8jsbvb.mongodb.net/?retryWrites=true&w=majority";

const DB_NAME = "flexidrive_fake";

const CANT_CLIENTES = 200;
const CANT_COMISIONISTAS = 50;
const CANT_ENVIOS = 1000;

faker.seed(20260312);

const ESTADOS = [
  "PENDIENTE",
  "ASIGNADO",
  "EN_RETIRO",
  "RETIRADO",
  "EN_CAMINO",
  "ENTREGADO",
  "DEMORADO",
  "DEMORADO_RETIRO",
  "DEMORADO_ENTREGA",
];

const FRANJAS = ["09:00-12:00", "13:00-16:00", "16:00-19:00"];

const PROVINCIAS = [
  { provincia: "Córdoba", ciudades: ["Villa María", "Córdoba", "Río Cuarto", "Bell Ville"] },
  { provincia: "Buenos Aires", ciudades: ["La Plata", "Mar del Plata", "Bahía Blanca"] },
  { provincia: "Santa Fe", ciudades: ["Rosario", "Santa Fe", "Rafaela"] },
  { provincia: "Mendoza", ciudades: ["Mendoza", "San Rafael"] },
];

function pickUbicacion() {
  const p = faker.helpers.arrayElement(PROVINCIAS);
  return {
    provincia: p.provincia,
    ciudad: faker.helpers.arrayElement(p.ciudades),
  };
}

function randomCoordsArgentina() {
  return {
    lat: Number(faker.location.latitude({ min: -38.5, max: -30.0 })),
    lng: Number(faker.location.longitude({ min: -65.5, max: -56.0 })),
  };
}

function buildDireccion() {
  const { provincia, ciudad } = pickUbicacion();
  const calle = faker.location.street();
  const numero = faker.number.int({ min: 100, max: 5000 }).toString();
  const piso = faker.helpers.maybe(() => faker.number.int({ min: 1, max: 12 }).toString(), {
    probability: 0.25,
  });
  const departamento = faker.helpers.maybe(
    () => faker.helpers.arrayElement(["A", "B", "C", "D"]),
    { probability: 0.2 }
  );
  const codigo_postal = faker.location.zipCode("####");
  const coords = randomCoordsArgentina();

  return {
    calle,
    numero,
    piso: piso || "",
    departamento: departamento || "",
    ciudad,
    provincia,
    codigo_postal,
    lat: coords.lat,
    lng: coords.lng,
    texto: `${calle} ${numero}, ${ciudad}, ${provincia}`,
  };
}

function randomDateThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return faker.date.between({ from: start, to: now });
}

function generarClientes() {
  return Array.from({ length: CANT_CLIENTES }).map(() => {
    const _id = new ObjectId();
    const nombre = faker.person.firstName();
    const apellido = faker.person.lastName();
    const direccion = buildDireccion();

    return {
      _id,
      nombre,
      apellido,
      username: faker.internet.username({ firstName: nombre, lastName: apellido }).toLowerCase(),
      email: faker.internet.email({ firstName: nombre, lastName: apellido }).toLowerCase(),
      telefono: faker.phone.number("353########"),
      rol: "cliente",
      activo: true,
      direccion,
      createdAt: randomDateThisMonth(),
      updatedAt: new Date(),
    };
  });
}

function generarComisionistas() {
  return Array.from({ length: CANT_COMISIONISTAS }).map(() => {
    const _id = new ObjectId();
    const nombre = faker.person.firstName();
    const apellido = faker.person.lastName();
    const direccion = buildDireccion();

    return {
      _id,
      nombre,
      apellido,
      username: faker.internet.username({ firstName: nombre, lastName: apellido }).toLowerCase(),
      email: faker.internet.email({ firstName: nombre, lastName: apellido }).toLowerCase(),
      telefono: faker.phone.number("353########"),
      rol: "comisionista",
      activo: true,
      verificado: true,
      calificacionPromedio: Number(faker.number.float({ min: 3.8, max: 5, fractionDigits: 1 })),
      viajesRealizados: faker.number.int({ min: 10, max: 250 }),
      vehiculo: faker.helpers.arrayElement(["Moto", "Auto", "Utilitario"]),
      patente: `${faker.string.alpha(2).toUpperCase()}${faker.number.int({ min: 100, max: 999 })}${faker.string.alpha(2).toUpperCase()}`,
      direccion,
      createdAt: randomDateThisMonth(),
      updatedAt: new Date(),
    };
  });
}

function calcularEstadoSegunFecha(fecha) {
  const r = faker.number.int({ min: 1, max: 100 });
  if (r <= 10) return "PENDIENTE";
  if (r <= 25) return "ASIGNADO";
  if (r <= 35) return "EN_RETIRO";
  if (r <= 50) return "RETIRADO";
  if (r <= 65) return "EN_CAMINO";
  if (r <= 85) return "ENTREGADO";
  if (r <= 90) return "DEMORADO";
  if (r <= 95) return "DEMORADO_RETIRO";
  return "DEMORADO_ENTREGA";
}

function generarEnvios(clientes, comisionistas) {
  return Array.from({ length: CANT_ENVIOS }).map((_, i) => {
    const _id = new ObjectId();
    const cliente = faker.helpers.arrayElement(clientes);
    const comisionista = faker.helpers.arrayElement(comisionistas);

    const origen = buildDireccion();
    const destino = buildDireccion();
    const fechaCreacion = randomDateThisMonth();
    const estado = calcularEstadoSegunFecha(fechaCreacion);
    const precio = faker.number.int({ min: 2500, max: 18000 });
    const distanciaKm = Number(
      faker.number.float({ min: 1.5, max: 35, fractionDigits: 1 })
    );

    return {
      _id,
      numero_envio: 100000 + i,
      clienteId: cliente._id,
      comisionistaId: comisionista._id,
      tripPlanId: new ObjectId(),
      estado,
      tipo_servicio: faker.helpers.arrayElement(["envio", "express", "programado"]),
      descripcion: faker.helpers.arrayElement([
        "Documentación",
        "Paquete pequeño",
        "Caja mediana",
        "Regalo",
        "Accesorios",
      ]),
      peso_kg: Number(faker.number.float({ min: 0.2, max: 18, fractionDigits: 1 })),
      precio,
      distancia_km: distanciaKm,
      direccion_retiro: origen,
      direccion_entrega: destino,
      franja_horaria_retiro: faker.helpers.arrayElement(FRANJAS),
      franja_horaria_entrega: faker.helpers.arrayElement(FRANJAS),
      fecha_retiro: fechaCreacion,
      fecha_entrega_estimada: faker.date.soon({ days: 3, refDate: fechaCreacion }),
      calificacion: estado === "ENTREGADO"
        ? faker.number.int({ min: 3, max: 5 })
        : null,
      observaciones: faker.helpers.maybe(() => faker.lorem.sentence(), {
        probability: 0.35,
      }) || "",
      historial_estados: [
        { estado: "PENDIENTE", fecha: fechaCreacion },
        ...(estado !== "PENDIENTE"
          ? [{ estado, fecha: faker.date.soon({ days: 1, refDate: fechaCreacion }) }]
          : []),
      ],
      createdAt: fechaCreacion,
      updatedAt: new Date(),
    };
  });
}

function generarTripPlans(comisionistas) {
  return comisionistas.map((c) => {
    const base = buildDireccion();
    return {
      _id: new ObjectId(),
      comisionistaId: c._id,
      nombre: `Ruta de ${c.nombre}`,
      dias: faker.helpers.arrayElements(
        ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"],
        { min: 2, max: 5 }
      ),
      puntoPartida: base,
      activo: true,
      createdAt: randomDateThisMonth(),
      updatedAt: new Date(),
    };
  });
}

async function seed() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const collections = ["users", "envios", "tripplans"];
    for (const name of collections) {
      const exists = await db.listCollections({ name }).toArray();
      if (exists.length === 0) {
        await db.createCollection(name);
      }
    }

    console.log("Limpiando colecciones...");
    await db.collection("users").deleteMany({});
    await db.collection("envios").deleteMany({});
    await db.collection("tripplans").deleteMany({});

    console.log("Generando usuarios...");
    const clientes = generarClientes();
    const comisionistas = generarComisionistas();
    const users = [...clientes, ...comisionistas];

    console.log("Generando tripplans...");
    const tripplans = generarTripPlans(comisionistas);

    console.log("Generando envíos...");
    const envios = generarEnvios(clientes, comisionistas);

    console.log("Insertando datos...");
    await db.collection("users").insertMany(users);
    await db.collection("tripplans").insertMany(tripplans);
    await db.collection("envios").insertMany(envios);

    console.log("✅ Seed completado");
    console.log(`Usuarios: ${users.length}`);
    console.log(`Clientes: ${clientes.length}`);
    console.log(`Comisionistas: ${comisionistas.length}`);
    console.log(`TripPlans: ${tripplans.length}`);
    console.log(`Envíos: ${envios.length}`);
  } catch (error) {
    console.error("❌ Error al poblar la base:", error);
  } finally {
    await client.close();
  }
}

seed();