// flexidrive-front/src/services/comisionistaServices/mock.js

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const rutasMock = [
  {
    id: "ruta_1",
    nombre: "Ruta Centro",
    activa: true,
    zonas: ["Centro", "Norte"],
  },
  {
    id: "ruta_2",
    nombre: "Ruta Sur",
    activa: false,
    zonas: ["Sur"],
  },
];

const agendaMock = [
  {
    id: "env_1",
    orden: 1,
    numero: "1001",
    cliente: "Juan Pérez",
    destino: "San Martín 123",
    localidad: "Villa María",
    estado: "ASIGNADO",
    tipo: "RETIRO",
    franja: "08:00-10:00",
    precio: 4200,
    fecha: new Date().toISOString(),
  },
  {
    id: "env_2",
    orden: 2,
    numero: "1002",
    cliente: "María Gómez",
    destino: "Buenos Aires 456",
    localidad: "Villa Nueva",
    estado: "EN_CAMINO",
    tipo: "ENTREGA",
    franja: "10:00-12:00",
    precio: 5800,
    fecha: new Date().toISOString(),
  },
  {
    id: "env_3",
    orden: 3,
    numero: "1003",
    cliente: "Carlos Ruiz",
    destino: "Mitre 789",
    localidad: "Villa María",
    estado: "RETIRADO",
    tipo: "ENTREGA",
    franja: "12:00-14:00",
    precio: 6100,
    fecha: new Date().toISOString(),
  },
  {
    id: "env_4",
    orden: 4,
    numero: "1004",
    cliente: "Lucía Fernández",
    destino: "Sarmiento 250",
    localidad: "Tío Pujio",
    estado: "ASIGNADO",
    tipo: "RETIRO",
    franja: "14:00-16:00",
    precio: 3900,
    fecha: new Date().toISOString(),
  },
  {
    id: "env_5",
    orden: 5,
    numero: "1005",
    cliente: "Ana López",
    destino: "Belgrano 88",
    localidad: "Villa María",
    estado: "ENTREGADO",
    tipo: "ENTREGA",
    franja: "16:00-18:00",
    precio: 7200,
    fecha: new Date().toISOString(),
  },
];

export const getDashboardResumenMock = async () => {
  await wait();

  return {
    enviosHoy: agendaMock.length,
    enRuta: agendaMock.filter((i) =>
      ["EN_CAMINO", "RETIRADO"].includes(i.estado)
    ).length,
    pendientesRetiro: agendaMock.filter((i) => i.tipo === "RETIRO" && i.estado === "ASIGNADO").length,
    calificacion: 4.8,
  };
};

export const getAgendaHoyMock = async () => {
  await wait();
  return { items: agendaMock };
};

export const generarRutaHoyMock = async () => {
  await wait();

  return {
    id: "ruta_optima_1",
    viaje_iniciado: false,
    distancia_total_km: 42.5,
    orden_entregas: agendaMock.map((item) => ({
      envioId: item.id,
      tipo: item.tipo === "RETIRO" ? "RETIRO" : "ENTREGA",
      cliente: item.cliente,
      destino: item.destino,
      localidad: item.localidad,
      estado: item.estado,
      completada: ["ENTREGADO"].includes(item.estado),
    })),
  };
};

export const getRutaActivaMock = async () => {
  await wait();

  return {
    id: "ruta_optima_1",
    viaje_iniciado: false,
    distancia_total_km: 42.5,
    orden_entregas: agendaMock.map((item) => ({
      envioId: item.id,
      tipo: item.tipo === "RETIRO" ? "RETIRO" : "ENTREGA",
      cliente: item.cliente,
      destino: item.destino,
      localidad: item.localidad,
      estado: item.estado,
      completada: ["ENTREGADO"].includes(item.estado),
    })),
  };
};

export const listRutasMock = async () => {
  await wait();
  return rutasMock;
};

export const createRutaMock = async (payload) => {
  await wait();
  return {
    id: `ruta_${Date.now()}`,
    ...payload,
  };
};

export const updateRutaMock = async (id, payload) => {
  await wait();
  return {
    id,
    ...payload,
  };
};

export const deleteRutaMock = async (id) => {
  await wait();
  return { ok: true, id };
};

export const confirmarFechaRetiroMock = async (params) => {
  await wait();
  return { ok: true, ...params };
};

export const completarParadaMock = async (params) => {
  await wait();
  return { ok: true, ...params };
};

/* ✅ NUEVO */
export const getEstadisticasComisionistaMock = async () => {
  await wait();

  const ingresosTotales = agendaMock.reduce((acc, item) => acc + (item.precio || 0), 0);
  const entregas = agendaMock.filter((i) => i.tipo !== "RETIRO").length;
  const retiros = agendaMock.filter((i) => i.tipo === "RETIRO").length;
  const viajes = 3;
  const distanciaTotal = 126;

  return {
    ingresosTotales,
    entregas,
    retiros,
    viajes,
    distanciaPromedio: distanciaTotal / viajes,
    ingresoPromedio: ingresosTotales / viajes,
  };
};