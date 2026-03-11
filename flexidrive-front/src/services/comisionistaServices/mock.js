// flexidrive-front/src/services/comisionistaServices/mock.js
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getDashboardResumenMock() {
  await wait(250);
  return {
    enviosHoy: 12,
    enRuta: 6,
    pendientesRetiro: 2,
    calificacion: 4.8,
  };
}

export async function getAgendaHoyMock() {
  await wait(250);
  return [
    {
      id: "1548",
      numero: "1548",
      orden: 1,
      cliente: "John Lilki",
      destino: "Ruta Nacional 9 km 560",
      localidad: "Tío Pujio",
      estado: "entregado",
    },
    {
      id: "2548",
      numero: "2548",
      orden: 2,
      cliente: "Jamie Harington",
      destino: "Av. Córdoba 875",
      localidad: "James Craik",
      estado: "en_camino",
    },
    {
      id: "257",
      numero: "257",
      orden: 3,
      cliente: "John Lilki",
      destino: "Ruta 9 Norte km 593",
      localidad: "Oliva",
      estado: "en_camino",
    },
    {
      id: "1574",
      numero: "1574",
      orden: 4,
      cliente: "Jamie Harington",
      destino: "Av. Libertador 1420",
      localidad: "Oliva",
      estado: "en_camino",
    },
    {
      id: "2385",
      numero: "2385",
      orden: 5,
      cliente: "John Lilki",
      destino: "Ruta Nacional 9 km 612",
      localidad: "Villa del Rosario",
      estado: "en_camino",
    },
  ];
}



// ─── Rutas (TripPlans) ───────────────────────────────────────────────────────
// FIX: el mock ahora usa exactamente la misma forma que devuelve el backend real:
//   - diasSemana: number[]  (0=Dom, 1=Lun … 6=Sáb)
//   - activo: boolean       (no "activa")
//   - preciosPorLocalidad[].precio: number  (no "precioPorBulto")
// tripPlanToRutaUI() convierte esto a la forma UI al leerlo.
// rutaToTripPlanPayload() convierte la forma UI a esto al guardarlo.

let ROUTES = [
  {
    _id: "r1",
    comisionistaId: "mock-user",
    vehiculoId: "veh_1",
    origen: {
      provinciaId: "14",
      provinciaNombre: "Córdoba",
      localidadId: "14098030",
      localidadNombre: "Villa María",
    },
    destino: {
      provinciaId: "14",
      provinciaNombre: "Córdoba",
      localidadId: "14014010",
      localidadNombre: "Córdoba",
    },
    intermedias: [
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14091060", localidadNombre: "Tío Pujio" },
      { provinciaId: "14", provinciaNombre: "Córdoba", localidadId: "14056010", localidadNombre: "Oliva" },
    ],
    diasSemana: [1, 3, 5], // Lun, Mié, Vie
    activo: true,
    preciosPorLocalidad: [
      { localidadId: "14014010", localidadNombre: "Córdoba",   precio: 1500 },
      { localidadId: "14091060", localidadNombre: "Tío Pujio", precio: 1200 },
      { localidadId: "14056010", localidadNombre: "Oliva",     precio: 1300 },
    ],
    descuentoPorBultos: { minBultos: 0, tipo: "porcentaje", valor: 0 },
  },
  {
    _id: "r2",
    comisionistaId: "mock-user",
    vehiculoId: "veh_2",
    origen: {
      provinciaId: "14",
      provinciaNombre: "Córdoba",
      localidadId: "14098030",
      localidadNombre: "Villa María",
    },
    destino: {
      provinciaId: "14",
      provinciaNombre: "Córdoba",
      localidadId: "14014010",
      localidadNombre: "Córdoba",
    },
    intermedias: [],
    diasSemana: [2, 4], // Mar, Jue
    activo: false,
    preciosPorLocalidad: [
      { localidadId: "14014010", localidadNombre: "Córdoba", precio: 1100 },
    ],
    descuentoPorBultos: { minBultos: 0, tipo: "porcentaje", valor: 0 },
  },
];

// Helper de búsqueda en texto
function routeText(r) {
  const inter   = (r.intermedias || []).map((x) => x.localidadNombre).join(" ");
  const dias    = (r.diasSemana  || []).join(" ");
  const precios = (r.preciosPorLocalidad || [])
    .map((p) => `${p.localidadNombre} ${p.precio}`)
    .join(" ");
  return `${r.origen?.localidadNombre} ${r.destino?.localidadNombre} ${inter} ${dias} ${precios}`.toLowerCase();
}

export async function listRutasMock({ q = "" } = {}) {
  await wait(200);
  const term = q.trim().toLowerCase();
  if (!term) return [...ROUTES];
  return ROUTES.filter((r) => routeText(r).includes(term));
}

export async function createRutaMock(data) {
  await wait(150);
  // data ya viene en formato backend (diasSemana, activo, precio)
  const newOne = { ...data, _id: `r${Date.now()}`, comisionistaId: "mock-user" };
  ROUTES = [newOne, ...ROUTES];
  return newOne;
}

export async function updateRutaMock(id, data) {
  await wait(150);
  ROUTES = ROUTES.map((r) => (String(r._id) === String(id) ? { ...r, ...data } : r));
  return ROUTES.find((r) => String(r._id) === String(id));
}

export async function deleteRutaMock(id) {
  await wait(150);
  ROUTES = ROUTES.filter((r) => String(r._id) !== String(id));
  return { ok: true };
}

const RUTA_MOCK = {
  _id: "ruta_mock_001",
  comisionistaId: "mock_comisionista",
  fecha_viaje: new Date().toISOString(),
  polyline: "_p~iF~cn~U_ulLnnqC_mqNvxq`@", // polyline de ejemplo (SF→LA)
  distancia_total_km: 42.3,
  tiempo_estimado_min: 65,
  activo: true,
  orden_entregas: [
    {
      envioId: "envio_001",
      nro_envio: "FD-001",
      orden: 1,
      tipo: "RETIRO",
      lat: -31.4167,
      lng: -64.1833,
      texto: "San Martín 123, Córdoba",
      franja_horaria: "08:00-10:00",
      fecha_retiro_confirmada: null,
      completada: false,
    },
    {
      envioId: "envio_001",
      nro_envio: "FD-001",
      orden: 2,
      tipo: "ENTREGA",
      lat: -31.3900,
      lng: -64.2100,
      texto: "Av. Colón 456, Córdoba",
      franja_horaria: null,
      fecha_retiro_confirmada: null,
      completada: false,
    },
    {
      envioId: "envio_002",
      nro_envio: "FD-002",
      orden: 3,
      tipo: "RETIRO",
      lat: -31.4300,
      lng: -64.1600,
      texto: "Belgrano 789, Villa Allende",
      franja_horaria: "10:00-12:00",
      fecha_retiro_confirmada: null,
      completada: false,
    },
    {
      envioId: "envio_002",
      nro_envio: "FD-002",
      orden: 4,
      tipo: "ENTREGA",
      lat: -31.3500,
      lng: -64.2500,
      texto: "Rivadavia 321, La Calera",
      franja_horaria: null,
      fecha_retiro_confirmada: null,
      completada: false,
    },
  ],
};

let rutaMockState = JSON.parse(JSON.stringify(RUTA_MOCK));

export function generarRutaHoyMock(_params = {}) {
  // Simula un pequeño delay de red
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ...rutaMockState }), 600)
  );
}

export function getRutaActivaMock(_params = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simula 404 si no hay ruta (para probar el fallback a generar)
      // Cambiar a reject({ response: { status: 404 } }) para probar ese path
      resolve({ ...rutaMockState });
    }, 300);
  });
}


export function confirmarFechaRetiroMock({ envioId, fecha } = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mutar la ruta mock en memoria
      rutaMockState = {
        ...rutaMockState,
        orden_entregas: rutaMockState.orden_entregas.map((p) =>
          String(p.envioId) === String(envioId) && p.tipo === "RETIRO"
            ? { ...p, fecha_retiro_confirmada: fecha + "T12:00:00.000Z" }
            : p
        ),
      };
      resolve({ message: "Fecha de retiro confirmada (mock).", fecha });
    }, 400);
  });
}

export function completarParadaMock({ envioId, tipo } = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Marcar como completada en el estado mock
      rutaMockState = {
        ...rutaMockState,
        orden_entregas: rutaMockState.orden_entregas.map((p) =>
          String(p.envioId) === String(envioId) && p.tipo === tipo
            ? { ...p, completada: true, completada_at: new Date().toISOString() }
            : p
        ),
      };
      resolve({ message: "Parada completada (mock).", ruta: rutaMockState });
    }, 500);
  });
}

