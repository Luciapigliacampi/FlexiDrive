import { MongoClient, ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";

const uri = "mongodb+srv://flexidrive9098:pabKgmiueWxx57TH@cluster0.j8jsbvb.mongodb.net/?retryWrites=true&w=majority";

const DB_NAME = "flexidrive_fake";

const CANT_CLIENTES = 120;
const CANT_COMISIONISTAS = 35;
const CANT_ENVIOS = 500;

const DIAS_HISTORICOS = 21;
const PORCENTAJE_ENVIOS_HOY = 0.22;
const PORCENTAJE_ENVIOS_AYER = 0.14;

faker.seed(20260312);

const FRANJAS = ["08:00-12:00", "13:00-17:00", "17:00-20:00"];
const TEST_DATE = process.env.TEST_DATE || null;

const ESTADOS_ENVIO = [
  "PENDIENTE",
  "ASIGNADO",
  "EN_RETIRO",
  "RETIRADO",
  "EN_CAMINO",
  "DEMORADO_RETIRO",
  "DEMORADO_ENTREGA",
  "ENTREGADO",
  "CANCELADO",
  "CANCELADO_RETORNO",
  "DEVUELTO",
];

const TIPOS_CUENTA = ["Caja de Ahorro", "Cuenta Corriente"];
const TIPOS_VEHICULO = ["auto", "camioneta", "utilitario", "furgon"];

const UBICACIONES = [
  {
    provinciaId: "14",
    provinciaNombre: "Córdoba",
    localidades: [
      { localidadId: "14042", localidadNombre: "Villa María" },
      { localidadId: "14014", localidadNombre: "Córdoba" },
      { localidadId: "14056", localidadNombre: "Bell Ville" },
      { localidadId: "14063", localidadNombre: "Río Cuarto" },
    ],
  },
  {
    provinciaId: "82",
    provinciaNombre: "Santa Fe",
    localidades: [
      { localidadId: "82084", localidadNombre: "Rosario" },
      { localidadId: "82091", localidadNombre: "Santa Fe" },
      { localidadId: "82073", localidadNombre: "Rafaela" },
    ],
  },
  {
    provinciaId: "06",
    provinciaNombre: "Buenos Aires",
    localidades: [
      { localidadId: "06014", localidadNombre: "La Plata" },
      { localidadId: "06056", localidadNombre: "Mar del Plata" },
      { localidadId: "06091", localidadNombre: "Bahía Blanca" },
    ],
  },
];

function getBaseNow() {
  if (!TEST_DATE) return new Date();
  const d = new Date(TEST_DATE);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function randomDateBetween(from, to) {
  return faker.date.between({ from, to });
}

function randomPastDate(daysBack = 60) {
  const to = getBaseNow();
  const from = new Date(to);
  from.setDate(to.getDate() - daysBack);
  return faker.date.between({ from, to });
}

function randomPastDateReal(daysBack = 60) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - daysBack);
  return faker.date.between({ from, to });
}

function diffDays(fromDate, toDate = getBaseNow()) {
  const ms = startOfDay(toDate) - startOfDay(fromDate);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function pickActivityBaseDate() {
  const now = getBaseNow();
  const todayStart = startOfDay(now);
  const yesterdayStart = addDays(todayStart, -1);

  const roll = Math.random();

  if (roll < PORCENTAJE_ENVIOS_HOY) {
    return randomDateBetween(todayStart, now);
  }

  if (roll < PORCENTAJE_ENVIOS_HOY + PORCENTAJE_ENVIOS_AYER) {
    return randomDateBetween(yesterdayStart, todayStart);
  }

  const oldFrom = addDays(todayStart, -DIAS_HISTORICOS);
  return randomDateBetween(oldFrom, yesterdayStart);
}

function pickProvincia() {
  return faker.helpers.arrayElement(UBICACIONES);
}

function pickLugar() {
  const provincia = pickProvincia();
  const localidad = faker.helpers.arrayElement(provincia.localidades);
  return {
    provinciaId: provincia.provinciaId,
    provinciaNombre: provincia.provinciaNombre,
    localidadId: localidad.localidadId,
    localidadNombre: localidad.localidadNombre,
  };
}

function randomCoordsArgentina() {
  return {
    lat: Number(faker.number.float({ min: -38.5, max: -30.0, fractionDigits: 6 })),
    lng: Number(faker.number.float({ min: -65.5, max: -56.0, fractionDigits: 6 })),
  };
}

function buildDireccionTexto(lugar) {
  const calle = faker.location.street();
  const numero = faker.number.int({ min: 100, max: 5000 });
  const coords = randomCoordsArgentina();
  return {
    texto: `${calle} ${numero}, ${lugar.localidadNombre}, ${lugar.provinciaNombre}`,
    lat: coords.lat,
    lng: coords.lng,
  };
}

async function generarPasswordHashFake() {
  return await bcrypt.hash("123456", 10);
}

function generarTelefono() {
  return `353${faker.string.numeric(7)}`;
}

function generarDni() {
  return faker.number.int({ min: 20000000, max: 45999999 });
}

function generarPatente() {
  return `${faker.string.alpha({ length: 2, casing: "upper" })}${faker.string.numeric(3)}${faker.string.alpha({ length: 2, casing: "upper" })}`;
}

function crearRoles() {
  return [
    { _id: "cliente", nombre: "Cliente" },
    { _id: "comisionista", nombre: "Comisionista" },
    { _id: "admin", nombre: "Administrador" },
  ];
}

async function generarUsuariosClientes() {
  const usuarios = [];
  for (let i = 0; i < CANT_CLIENTES; i++) {
    const _id = new ObjectId();
    const nombre = faker.person.firstName();
    const apellido = faker.person.lastName();
    usuarios.push({
      _id,
      nombre,
      apellido,
      email: faker.internet.email({ firstName: nombre, lastName: apellido }).toLowerCase(),
      contraseña_hash: await generarPasswordHashFake(),
      estado: "activo",
      dni: generarDni(),
      fecha_nacimiento: faker.date.birthdate({ min: 20, max: 65, mode: "age" }),
      fecha_registro: randomPastDateReal(120),
      telefono: generarTelefono(),
      totpSecret: null,
      tempTotpSecret: null,
    });
  }
  return usuarios;
}

async function generarUsuariosComisionistas() {
  const usuarios = [];
  for (let i = 0; i < CANT_COMISIONISTAS; i++) {
    const _id = new ObjectId();
    const nombre = faker.person.firstName();
    const apellido = faker.person.lastName();
    usuarios.push({
      _id,
      nombre,
      apellido,
      email: faker.internet.email({ firstName: nombre, lastName: apellido }).toLowerCase(),
      contraseña_hash: await generarPasswordHashFake(),
      estado: "activo",
      dni: generarDni(),
      fecha_nacimiento: faker.date.birthdate({ min: 21, max: 60, mode: "age" }),
      fecha_registro: randomPastDateReal(180),
      telefono: generarTelefono(),
      totpSecret: null,
      tempTotpSecret: null,
    });
  }
  return usuarios;
}

function generarUsuarioxRol(clientes, comisionistas) {
  const clientesRol = clientes.map((u) => ({
    _id: new ObjectId(),
    usuarioId: u._id,
    rolId: "cliente",
    creado_en: u.fecha_registro,
  }));

  const comisionistasRol = comisionistas.map((u) => ({
    _id: new ObjectId(),
    usuarioId: u._id,
    rolId: "comisionista",
    creado_en: u.fecha_registro,
  }));

  return [...clientesRol, ...comisionistasRol];
}

function generarPerfilesComisionista(comisionistas) {
  return comisionistas.map((u) => ({
    _id: new ObjectId(),
    usuarioId: u._id,
    entidadBancaria: faker.helpers.arrayElement([
      "Banco Nación", "Banco Santander", "BBVA", "Banco Macro", "Bancor",
    ]),
    nroCuenta: faker.string.numeric(12),
    tipoCuenta: faker.helpers.arrayElement(TIPOS_CUENTA),
    alias: faker.internet.username().toLowerCase(),
    cbu: faker.string.numeric(22),
    cuit: `20${faker.string.numeric(8)}${faker.string.numeric(1)}`,
    dniFrenteUrl: faker.internet.url(),
    dniDorsoUrl: faker.internet.url(),
    fecha_Alta: randomPastDateReal(150),
    verificado: faker.datatype.boolean(0.85),
    reputacion: Number(faker.number.float({ min: 3.5, max: 5, fractionDigits: 1 })),
  }));
}

function generarVehiculos(comisionistas) {
  return comisionistas.map((u) => ({
    _id: new ObjectId(),
    comisionistaId: u._id,
    nombre: faker.helpers.arrayElement([
      "Mi vehículo principal", "Utilitario blanco", "Camioneta de reparto", "Auto de trabajo",
    ]),
    adicionales: faker.helpers.arrayElement([
      "Seguro al día", "Aire acondicionado", "Carga mediana", "Uso urbano", "",
    ]),
    marca: faker.helpers.arrayElement([
      "Fiat", "Renault", "Ford", "Peugeot", "Volkswagen", "Citroën", "Toyota",
    ]),
    modelo: faker.helpers.arrayElement([
      "Fiorino", "Kangoo", "Partner", "Berlingo", "Hilux", "Ranger", "Gol", "Cronos",
    ]),
    patente: generarPatente(),
    tipo: faker.helpers.arrayElement(TIPOS_VEHICULO),
    capacidad: faker.number.int({ min: 50, max: 1500 }),
    verificado: faker.datatype.boolean(0.9),
    tarjetaVerdeUrl: faker.internet.url(),
    createdAt: randomPastDate(150),
    updatedAt: new Date(),
  }));
}

function generarTripPlans(comisionistas, vehiculosPorComisionista) {
  return comisionistas.map((u) => {
    const vehiculo = vehiculosPorComisionista[String(u._id)];
    const origen = pickLugar();
    const destino = pickLugar();

    const intermedias = faker.helpers.arrayElements(
      UBICACIONES.flatMap((prov) =>
        prov.localidades.map((loc) => ({
          provinciaId: prov.provinciaId,
          provinciaNombre: prov.provinciaNombre,
          localidadId: loc.localidadId,
          localidadNombre: loc.localidadNombre,
        }))
      ).filter(
        (loc) =>
          loc.localidadId !== origen.localidadId &&
          loc.localidadId !== destino.localidadId
      ),
      { min: 0, max: 3 }
    );

    const localidadesConPrecio = [destino, ...intermedias].filter(
      (loc, index, self) =>
        index === self.findIndex((x) => x.localidadId === loc.localidadId)
    );

    const preciosPorLocalidad = localidadesConPrecio.map((loc) => ({
      localidadId: loc.localidadId,
      localidadNombre: loc.localidadNombre,
      precio: faker.number.int({ min: 1800, max: 9500 }),
    }));

    return {
      _id: new ObjectId(),
      comisionistaId: String(u._id),
      vehiculoId: String(vehiculo._id),
      origen: {
        provinciaId: origen.provinciaId,
        provinciaNombre: origen.provinciaNombre,
        localidadId: origen.localidadId,
        localidadNombre: origen.localidadNombre,
      },
      destino: {
        provinciaId: destino.provinciaId,
        provinciaNombre: destino.provinciaNombre,
        localidadId: destino.localidadId,
        localidadNombre: destino.localidadNombre,
      },
      intermedias,
      diasSemana: faker.helpers.arrayElements([1, 2, 3, 4, 5, 6], { min: 2, max: 5 }),
      activo: true,
      preciosPorLocalidad,
      descuentoPorBultos: {
        minBultos: faker.helpers.arrayElement([0, 2, 3, 4]),
        tipo: faker.helpers.arrayElement(["porcentaje", "monto"]),
        valor: faker.number.int({ min: 5, max: 20 }),
      },
      createdAt: randomPastDate(100),
      updatedAt: new Date(),
    };
  });
}

function pickEstadoSegunAntiguedad(fechaBase) {
  const dias = diffDays(fechaBase);

  if (dias === 0) {
    return faker.helpers.weightedArrayElement([
      { weight: 18, value: "PENDIENTE" },
      { weight: 26, value: "ASIGNADO" },
      { weight: 18, value: "EN_RETIRO" },
      { weight: 14, value: "RETIRADO" },
      { weight: 14, value: "EN_CAMINO" },
      { weight: 5, value: "DEMORADO_RETIRO" },
      { weight: 5, value: "DEMORADO_ENTREGA" },
    ]);
  }

  if (dias === 1) {
    return faker.helpers.weightedArrayElement([
      { weight: 8, value: "ASIGNADO" },
      { weight: 12, value: "EN_RETIRO" },
      { weight: 15, value: "RETIRADO" },
      { weight: 18, value: "EN_CAMINO" },
      { weight: 10, value: "DEMORADO_RETIRO" },
      { weight: 12, value: "DEMORADO_ENTREGA" },
      { weight: 25, value: "ENTREGADO" },
    ]);
  }

  return faker.helpers.weightedArrayElement([
    { weight: 5, value: "ASIGNADO" },
    { weight: 5, value: "EN_RETIRO" },
    { weight: 8, value: "RETIRADO" },
    { weight: 10, value: "EN_CAMINO" },
    { weight: 10, value: "DEMORADO_RETIRO" },
    { weight: 12, value: "DEMORADO_ENTREGA" },
    { weight: 50, value: "ENTREGADO" },
  ]);
}

function generarPaquete(clienteId) {
  return {
    alto: faker.number.int({ min: 10, max: 80 }),
    ancho: faker.number.int({ min: 10, max: 80 }),
    profundidad: faker.number.int({ min: 5, max: 70 }),
    peso: Number(faker.number.float({ min: 0.3, max: 20, fractionDigits: 1 })),
    contenido: faker.helpers.arrayElement([
      "Documentación", "Ropa", "Electrónica", "Regalo", "Accesorios", "Caja mediana",
    ]),
    fragil: faker.datatype.boolean(0.25),
    codigo_paquete: `PK-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    clienteId,
  };
}

// FIX 1: destinatarioId se asigna aleatoriamente desde la lista real de destinatarios
function generarEnvios(clientes, comisionistas, tripPlansPorComisionista, destinatarios) {
  const envios = [];
  const envioXComisionista = [];

  // Índice de destinatarios por clienteId para asignación rápida
  const destinatariosPorCliente = {};
  for (const d of destinatarios) {
    const key = String(d.userId);
    if (!destinatariosPorCliente[key]) destinatariosPorCliente[key] = [];
    destinatariosPorCliente[key].push(d);
  }

  for (let i = 0; i < CANT_ENVIOS; i++) {
    const _id = new ObjectId();
    const cliente = faker.helpers.arrayElement(clientes);

    const origenLugar = pickLugar();
    const destinoLugar = pickLugar();

    const direccion_origen = buildDireccionTexto(origenLugar);
    const direccion_destino = buildDireccionTexto(destinoLugar);

    const fechaBase = pickActivityBaseDate();
    const estadoId = pickEstadoSegunAntiguedad(fechaBase);

    const asignado = estadoId !== "PENDIENTE";
    const comisionista = asignado ? faker.helpers.arrayElement(comisionistas) : null;

    const tripPlan =
      comisionista && tripPlansPorComisionista[String(comisionista._id)]
        ? tripPlansPorComisionista[String(comisionista._id)]
        : null;

    const fechaRetiro =
      ["RETIRADO", "EN_CAMINO", "ENTREGADO", "DEMORADO_ENTREGA"].includes(estadoId)
        ? addDays(fechaBase, faker.number.int({ min: 0, max: 1 }))
        : null;

    const fechaEntrega = addDays(fechaBase, faker.number.int({ min: 1, max: 4 }));

    const paquetes = Array.from(
      { length: faker.number.int({ min: 1, max: 3 }) },
      () => generarPaquete(cliente._id)
    );

    // FIX 1: asignar destinatarioId real del cliente, con probabilidad de 70%
    const destinatariosDelCliente = destinatariosPorCliente[String(cliente._id)] || [];
    const destinatarioId =
      destinatariosDelCliente.length > 0 && faker.datatype.boolean(0.7)
        ? faker.helpers.arrayElement(destinatariosDelCliente)._id
        : null;

    const envio = {
      _id,
      usuarioId: cliente._id,
      comisionistaId: comisionista ? comisionista._id : null,
      destinatarioId, // FIX 1: ahora tiene valor real
      direccion_origen,
      direccion_destino,
      origenCiudad: {
        localidadId: origenLugar.localidadId,
        localidadNombre: origenLugar.localidadNombre,
      },
      destinoCiudad: {
        localidadId: destinoLugar.localidadId,
        localidadNombre: destinoLugar.localidadNombre,
      },
      nro_envio: String(100000 + i),
      paquetes,
      costo_estimado: faker.number.int({ min: 1800, max: 18000 }),
      fecha_entrega: fechaEntrega,
      franja_horaria_retiro: faker.helpers.arrayElement(FRANJAS),
      fecha_retiro: fechaRetiro,
      estadoId,
      tripPlanId: tripPlan ? tripPlan._id : null,
      notas_adicionales:
        faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) || "",
      polyline_especifica: "",
      archivado: false,
      eliminado: false,
      createdAt: fechaBase,
      updatedAt: new Date(),
    };

    envios.push(envio);

    if (comisionista) {
      envioXComisionista.push({
        _id: new ObjectId(),
        comisionistaId: comisionista._id,
        envioId: _id,
        // FIX 2: vehiculoId null si no hay tripPlan, nunca un ObjectId inventado
        vehiculoId: tripPlan ? new ObjectId(tripPlan.vehiculoId) : null,
        tripPlanId: tripPlan ? tripPlan._id : null,
        precio_final: envio.costo_estimado,
        fecha_asignacion: addDays(fechaBase, 0),
        fecha_inicio_retiro: [
          "EN_RETIRO", "RETIRADO", "EN_CAMINO", "ENTREGADO", "DEMORADO_ENTREGA",
        ].includes(estadoId)
          ? addDays(fechaBase, 0)
          : null,
        fecha_retiro: fechaRetiro,
        fecha_demora: ["DEMORADO_RETIRO", "DEMORADO_ENTREGA"].includes(estadoId)
          ? addDays(fechaBase, faker.number.int({ min: 1, max: 2 }))
          : null,
        fecha_inicio: ["EN_CAMINO", "ENTREGADO", "DEMORADO_ENTREGA"].includes(estadoId)
          ? addDays(fechaBase, faker.number.int({ min: 1, max: 2 }))
          : null,
        fecha_fin:
          estadoId === "ENTREGADO"
            ? addDays(fechaBase, faker.number.int({ min: 2, max: 4 }))
            : null,
        distanciaKm: Number(faker.number.float({ min: 1, max: 40, fractionDigits: 1 })),
        estado_id:
          estadoId === "RETIRADO"
            ? "EN_CAMINO"
            : ["DEMORADO_RETIRO", "DEMORADO_ENTREGA"].includes(estadoId)
            ? "DEMORADO"
            : estadoId,
        createdAt: fechaBase,
        updatedAt: new Date(),
      });
    }
  }

  return { envios, envioXComisionista };
}

// FIX 3: retiros cuenta solo EN_RETIRO y RETIRADO, sin solaparse con entregas
function generarEstadisticasComisionista(comisionistas, envios) {
  const stats = [];
  const hoy = getBaseNow();

  for (const comisionista of comisionistas) {
    for (let i = DIAS_HISTORICOS; i >= 0; i--) {
      const dia = startOfDay(addDays(hoy, -i));

      const enviosDia = envios.filter(
        (e) =>
          String(e.comisionistaId) === String(comisionista._id) &&
          startOfDay(e.createdAt).getTime() === dia.getTime()
      );

      const entregas = enviosDia.filter((e) => e.estadoId === "ENTREGADO").length;

      // FIX 3: retiros ya no incluye ENTREGADO (evita doble conteo)
      const retiros = enviosDia.filter((e) =>
        ["EN_RETIRO", "RETIRADO"].includes(e.estadoId)
      ).length;

      const ingresosTotales = enviosDia.reduce(
        (acc, e) => acc + (e.costo_estimado || 0),
        0
      );

      stats.push({
        _id: new ObjectId(),
        comisionistaId: String(comisionista._id),
        fecha: dia,
        enviosTotales: enviosDia.length,
        entregas,
        retiros,
        ingresosTotales,
        distanciaKm:
          enviosDia.length === 0
            ? 0
            : Number(faker.number.float({ min: 5, max: 70, fractionDigits: 1 })),
        viajes:
          enviosDia.length === 0
            ? 0
            : faker.number.int({ min: 1, max: Math.min(6, enviosDia.length) }),
        createdAt: dia,
        updatedAt: new Date(),
      });
    }
  }

  return stats;
}

// FIX 4: rutas para TODOS los comisionistas, no solo los primeros 20
function generarRutasOptimas(comisionistas, envios) {
  const rutas = [];
  const hoy = startOfDay(getBaseNow());

  for (const comisionista of comisionistas) { // FIX 4: sin .slice(0, 20)
    const fechasRuta = [hoy, addDays(hoy, -1), addDays(hoy, -2)];

    for (const fechaRuta of fechasRuta) {
      const enviosDelDia = envios
        .filter(
          (e) =>
            String(e.comisionistaId) === String(comisionista._id) &&
            startOfDay(e.createdAt).getTime() === fechaRuta.getTime() &&
            [
              "ASIGNADO", "EN_RETIRO", "RETIRADO", "EN_CAMINO",
              "DEMORADO_RETIRO", "DEMORADO_ENTREGA", "ENTREGADO",
            ].includes(e.estadoId)
        )
        .slice(0, 5);

      if (!enviosDelDia.length) continue;

      const orden_entregas = [];
      let orden = 1;

      for (const envio of enviosDelDia) {
        orden_entregas.push({
          envioId: envio._id,
          nro_envio: envio.nro_envio,
          orden: orden++,
          tipo: "RETIRO",
          lat: envio.direccion_origen.lat,
          lng: envio.direccion_origen.lng,
          texto: envio.direccion_origen.texto,
          franja_horaria: envio.franja_horaria_retiro,
          fecha_retiro_confirmada: envio.fecha_retiro || null,
          completada: ["RETIRADO", "EN_CAMINO", "ENTREGADO"].includes(envio.estadoId),
          completada_at: ["RETIRADO", "EN_CAMINO", "ENTREGADO"].includes(envio.estadoId)
            ? addDays(envio.createdAt, 1)
            : null,
          distancia_km: Number(faker.number.float({ min: 1, max: 8, fractionDigits: 1 })),
        });

        orden_entregas.push({
          envioId: envio._id,
          nro_envio: envio.nro_envio,
          orden: orden++,
          tipo: "ENTREGA",
          lat: envio.direccion_destino.lat,
          lng: envio.direccion_destino.lng,
          texto: envio.direccion_destino.texto,
          franja_horaria: faker.helpers.arrayElement(FRANJAS),
          fecha_retiro_confirmada: null,
          completada: envio.estadoId === "ENTREGADO",
          completada_at:
            envio.estadoId === "ENTREGADO" ? addDays(envio.createdAt, 2) : null,
          distancia_km: Number(faker.number.float({ min: 1, max: 8, fractionDigits: 1 })),
        });
      }

      rutas.push({
        _id: new ObjectId(),
        comisionistaId: comisionista._id,
        fecha_generada: fechaRuta,
        fecha_viaje: fechaRuta,
        orden_entregas,
        polyline: "",
        distancia_total_km: Number(
          faker.number.float({ min: 5, max: 80, fractionDigits: 1 })
        ),
        tiempo_estimado_min: faker.number.int({ min: 25, max: 240 }),
        activo: fechaRuta.getTime() === hoy.getTime(),
        viaje_iniciado:
          fechaRuta.getTime() === hoy.getTime()
            ? faker.datatype.boolean(0.65)
            : true,
        lat_inicio:
          faker.helpers.maybe(() => randomCoordsArgentina().lat, { probability: 0.65 }) ?? null,
        lng_inicio:
          faker.helpers.maybe(() => randomCoordsArgentina().lng, { probability: 0.65 }) ?? null,
        createdAt: fechaRuta,
        updatedAt: new Date(),
      });
    }
  }

  return rutas;
}

function generarDestinatarios(clientes) {
  return clientes.flatMap((cliente) => {
    const cantidad = faker.number.int({ min: 1, max: 4 });
    return Array.from({ length: cantidad }).map(() => {
      const lugar = pickLugar();
      const direccion = buildDireccionTexto(lugar);
      return {
        _id: new ObjectId(),
        userId: cliente._id,
        apellido: faker.person.lastName(),
        nombre: faker.person.firstName(),
        dni: String(generarDni()),
        telefono: generarTelefono(),
        direccion: direccion.texto,
        provincia: { provinciaId: lugar.provinciaId, provinciaNombre: lugar.provinciaNombre },
        localidad: { localidadId: lugar.localidadId, localidadNombre: lugar.localidadNombre },
        cp: faker.location.zipCode("####"),
        placeId: `place_${faker.string.alphanumeric(16)}`,
        lat: direccion.lat,
        lng: direccion.lng,
        createdAt: randomPastDate(90),
        updatedAt: new Date(),
      };
    });
  });
}

function generarDireccionesFrecuentes(clientes) {
  return clientes.flatMap((cliente) => {
    const cantidad = faker.number.int({ min: 1, max: 3 });
    return Array.from({ length: cantidad }).map(() => {
      const lugar = pickLugar();
      const direccion = buildDireccionTexto(lugar);
      return {
        _id: new ObjectId(),
        userId: cliente._id,
        alias: faker.helpers.arrayElement([
          "Casa", "Trabajo", "Oficina", "Depósito", "Lo de mamá",
        ]),
        direccion: direccion.texto,
        provincia: { provinciaId: lugar.provinciaId, provinciaNombre: lugar.provinciaNombre },
        localidad: { localidadId: lugar.localidadId, localidadNombre: lugar.localidadNombre },
        cp: faker.location.zipCode("####"),
        placeId: `place_${faker.string.alphanumeric(16)}`,
        lat: direccion.lat,
        lng: direccion.lng,
        createdAt: randomPastDate(90),
        updatedAt: new Date(),
      };
    });
  });
}

// FIX 4 (calificaciones): distribuir sobre todos los envíos entregados, sin slice arbitrario
function generarCalificaciones(envios) {
  const entregados = envios.filter(
    (e) => e.estadoId === "ENTREGADO" && e.comisionistaId
  );

  // 70% de los entregados recibe calificación (más realista que un slice fijo)
  return entregados
    .filter(() => faker.datatype.boolean(0.7))
    .map((envio) => ({
      _id: new ObjectId(),
      envioId: envio._id,
      emisorId: envio.usuarioId,
      receptorId: envio.comisionistaId,
      puntuacion: faker.number.int({ min: 6, max: 10 }),
      comentario:
        faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.65 }) || "",
      fecha: addDays(envio.createdAt, faker.number.int({ min: 1, max: 5 })),
      createdAt: addDays(envio.createdAt, faker.number.int({ min: 1, max: 5 })),
      updatedAt: new Date(),
    }));
}

function generarEstadisticasCliente(clientes, envios) {
  const stats = [];
  const hoy = getBaseNow();

  for (const cliente of clientes) {
    for (let i = DIAS_HISTORICOS; i >= 0; i--) {
      const dia = startOfDay(addDays(hoy, -i));

      const enviosDia = envios.filter(
        (e) =>
          String(e.usuarioId) === String(cliente._id) &&
          startOfDay(e.createdAt).getTime() === dia.getTime()
      );

      const enviosEntregados = enviosDia.filter((e) => e.estadoId === "ENTREGADO").length;
      const enviosPendientes = enviosDia.filter((e) =>
        ["PENDIENTE", "ASIGNADO", "EN_RETIRO", "RETIRADO", "EN_CAMINO"].includes(e.estadoId)
      ).length;
      const enviosCancelados = enviosDia.filter((e) =>
        ["CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"].includes(e.estadoId)
      ).length;
      const gastoTotal = enviosDia.reduce((acc, e) => acc + (e.costo_estimado || 0), 0);

      stats.push({
        _id: new ObjectId(),
        clienteId: String(cliente._id),
        fecha: dia,
        enviosTotales: enviosDia.length,
        enviosEntregados,
        enviosPendientes,
        enviosCancelados,
        gastoTotal,
        createdAt: dia,
        updatedAt: new Date(),
      });
    }
  }

  return stats;
}

function generarNotificaciones(comisionistas, envios) {
  const notificaciones = [];

  for (const envio of envios.slice(0, 180)) {
    notificaciones.push({
      _id: new ObjectId(),
      userId: envio.usuarioId,
      rol: "cliente",
      tipo: faker.helpers.arrayElement([
        "ENVIO_ACEPTADO", "ESTADO_ACTUALIZADO", "RETIRO_CONFIRMADO", "PAGO_CONFIRMADO",
      ]),
      titulo: faker.helpers.arrayElement([
        "Actualización de tu envío", "Tu envío fue aceptado",
        "Retiro confirmado", "Pago confirmado",
      ]),
      contenido: `El envío #${envio.nro_envio} tuvo una actualización.`,
      leida: faker.datatype.boolean(0.45),
      visible: true,
      envioId: envio._id,
      createdAt: envio.createdAt,
      updatedAt: new Date(),
    });
  }

  for (const comisionista of comisionistas) {
    notificaciones.push({
      _id: new ObjectId(),
      userId: comisionista._id,
      rol: "comisionista",
      tipo: faker.helpers.arrayElement([
        "NUEVO_ENVIO_DISPONIBLE", "RECORDATORIO_ENTREGAS",
      ]),
      titulo: faker.helpers.arrayElement([
        "Nuevo envío disponible", "Tenés entregas pendientes",
      ]),
      contenido: "Revisá tu panel para ver la actividad del día.",
      leida: faker.datatype.boolean(0.55),
      visible: true,
      envioId: null,
      createdAt: randomPastDate(15),
      updatedAt: new Date(),
    });
  }

  return notificaciones;
}

async function recreateCollection(db, name) {
  const exists = await db.listCollections({ name }).toArray();
  if (exists.length > 0) {
    await db.collection(name).drop().catch(() => {});
  }
  await db.createCollection(name);
}

async function seed() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log(`Conectado a ${DB_NAME}`);

    const collections = [
      "rol", "usuarios", "usuarioxrol", "comisionista", "vehiculos",
      "tripplans", "envios", "envioXComisionista", "rutasOptimas",
      "notificaciones", "estadisticacomisionistas", "calificaciones",
      "destinatarios", "direccionfrecuentes", "estadisticascliente",
    ];

    console.log("Recreando colecciones...");
    for (const name of collections) {
      await recreateCollection(db, name);
      console.log(`- ${name}`);
    }

    console.log("Generando roles...");
    const roles = crearRoles();

    console.log("Generando usuarios...");
    const clientes = await generarUsuariosClientes();
    const comisionistas = await generarUsuariosComisionistas();
    const usuarios = [...clientes, ...comisionistas];

    console.log("Generando usuarioxrol...");
    const usuarioxrol = generarUsuarioxRol(clientes, comisionistas);

    console.log("Generando perfiles de comisionista...");
    const perfilesComisionista = generarPerfilesComisionista(comisionistas);

    console.log("Generando vehículos...");
    const vehiculos = generarVehiculos(comisionistas);
    const vehiculosPorComisionista = Object.fromEntries(
      vehiculos.map((v) => [String(v.comisionistaId), v])
    );

    console.log("Generando tripplans...");
    const tripplans = generarTripPlans(comisionistas, vehiculosPorComisionista);
    const tripPlansPorComisionista = Object.fromEntries(
      tripplans.map((t) => [String(t.comisionistaId), t])
    );

    // FIX 1: destinatarios se genera ANTES que envios para poder asignar destinatarioId
    console.log("Generando destinatarios...");
    const destinatarios = generarDestinatarios(clientes);

    console.log("Generando envíos...");
    const { envios, envioXComisionista } = generarEnvios(
      clientes,
      comisionistas,
      tripPlansPorComisionista,
      destinatarios // FIX 1: se pasa al generador
    );

    console.log("Generando rutas óptimas...");
    const rutasOptimas = generarRutasOptimas(comisionistas, envios);

    console.log("Generando estadísticas de comisionista...");
    const estadisticas = generarEstadisticasComisionista(comisionistas, envios);

    console.log("Generando notificaciones...");
    const notificaciones = generarNotificaciones(comisionistas, envios);

    console.log("Generando direcciones frecuentes...");
    const direccionfrecuentes = generarDireccionesFrecuentes(clientes);

    console.log("Generando calificaciones...");
    const calificaciones = generarCalificaciones(envios);

    console.log("Generando estadísticas de cliente...");
    const estadisticasCliente = generarEstadisticasCliente(clientes, envios);

    console.log("Insertando datos...");
    await db.collection("rol").insertMany(roles);
    await db.collection("usuarios").insertMany(usuarios);
    await db.collection("usuarioxrol").insertMany(usuarioxrol);
    await db.collection("comisionista").insertMany(perfilesComisionista);
    await db.collection("vehiculos").insertMany(vehiculos);
    await db.collection("tripplans").insertMany(tripplans);
    await db.collection("envios").insertMany(envios);
    await db.collection("envioXComisionista").insertMany(envioXComisionista);
    await db.collection("rutasOptimas").insertMany(rutasOptimas);
    await db.collection("notificaciones").insertMany(notificaciones);
    await db.collection("estadisticacomisionistas").insertMany(estadisticas);
    await db.collection("destinatarios").insertMany(destinatarios);
    await db.collection("direccionfrecuentes").insertMany(direccionfrecuentes);
    await db.collection("calificaciones").insertMany(calificaciones);
    await db.collection("estadisticascliente").insertMany(estadisticasCliente);

    console.log("\n✅ Seed completado correctamente");
    console.log(`Roles: ${roles.length}`);
    console.log(`Usuarios: ${usuarios.length} (clientes: ${clientes.length}, comisionistas: ${comisionistas.length})`);
    console.log(`Perfiles comisionista: ${perfilesComisionista.length}`);
    console.log(`Vehículos: ${vehiculos.length}`);
    console.log(`TripPlans: ${tripplans.length}`);
    console.log(`Destinatarios: ${destinatarios.length}`);
    console.log(`Envíos: ${envios.length}`);
    console.log(`EnvioXComisionista: ${envioXComisionista.length}`);
    console.log(`Rutas óptimas: ${rutasOptimas.length}`);
    console.log(`Notificaciones: ${notificaciones.length}`);
    console.log(`Estadísticas comisionista: ${estadisticas.length}`);
    console.log(`Calificaciones: ${calificaciones.length}`);
    console.log(`Direcciones frecuentes: ${direccionfrecuentes.length}`);
    console.log(`Estadísticas cliente: ${estadisticasCliente.length}`);
  } catch (error) {
    console.error("❌ Error al poblar la base:", error);
  } finally {
    await client.close();
  }
}

seed();