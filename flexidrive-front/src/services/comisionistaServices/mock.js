//flexidrive-front\src\services\comisionistaServices\mock.js
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

export async function getRutaSugeridaMock() {
  await wait(200);
  return {
    titulo: "Villa María - Córdoba",
    retiros: 2,
    retiros2: 3,
    entregas: 3,
    // más adelante podés agregar waypoints/coords
    waypoints: [],
  };
}

let ROUTES = [
  {
    id: "r1",
    vehiculoId: "veh_1",
    origen: {
      provinciaId: "14",
      provinciaNombre: "Córdoba",
      localidadId: "14098030",   // Villa María (ID real georef)
      localidadNombre: "Villa María",
    },
    destino: {
      provinciaId: "14",
      provinciaNombre: "Córdoba",
      localidadId: "14014010",   // Córdoba capital (ID real georef)
      localidadNombre: "Córdoba",
    },
    intermedias: [
      {
        provinciaId: "14",
        provinciaNombre: "Córdoba",
        localidadId: "14091060",  // Tío Pujio (ID real georef)
        localidadNombre: "Tío Pujio",
      },
      {
        provinciaId: "14",
        provinciaNombre: "Córdoba",
        localidadId: "14056010",  // Oliva (ID real georef)
        localidadNombre: "Oliva",
      },
    ],
    dias: ["Lun", "Mié", "Vie"],
    activa: true,
    preciosPorLocalidad: [
      { localidadNombre: "Córdoba", precioPorBulto: 1500 },
      { localidadNombre: "Tío Pujio", precioPorBulto: 1200 },
      { localidadNombre: "Oliva", precioPorBulto: 1300 },
    ],
  },
  {
    id: "r2",
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
    dias: ["Mar", "Jue"],
    activa: false,
    preciosPorLocalidad: [{ localidadNombre: "Córdoba", precioPorBulto: 1100 }],
  },
];

function routeText(r) {
  const inter = (r.intermedias || []).map((x) => x.localidadNombre).join(" ");
  const dias = (r.dias || []).join(" ");
  const precios = (r.preciosPorLocalidad || [])
    .map((p) => `${p.localidadNombre} ${p.precioPorBulto}`)
    .join(" ");
  return `${r.origen?.localidadNombre} ${r.destino?.localidadNombre} ${inter} ${dias} ${precios}`.toLowerCase();
}

export async function listRutasMock({ q = "" } = {}) {
  await wait(200);
  const term = q.trim().toLowerCase();
  if (!term) return ROUTES;
  return ROUTES.filter((r) => routeText(r).includes(term));
}

export async function createRutaMock(data) {
  await wait(150);
  const newOne = { ...data, id: `r${Date.now()}` };
  ROUTES = [newOne, ...ROUTES];
  return newOne;
}

export async function updateRutaMock(id, data) {
  await wait(150);
  ROUTES = ROUTES.map((r) => (r.id === id ? { ...r, ...data } : r));
  return ROUTES.find((r) => r.id === id);
}

export async function deleteRutaMock(id) {
  await wait(150);
  ROUTES = ROUTES.filter((r) => r.id !== id);
  return { ok: true };
}