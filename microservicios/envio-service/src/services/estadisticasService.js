// services/estadisticaService.js
import EstadisticaComisionista from "../models/estadisticaComisionistaModel.js";
import EnvioXComisionista from "../models/envioXcomisionistaModel.js";
import EstadisticaCliente from "../models/estadisticaClienteModel.js";


export async function registrarEstadisticaCliente({ clienteId, fecha }) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  const enviosDelDia = await Envio.find({
    usuarioId: clienteId,
    eliminado: { $ne: true },
    createdAt: { $gte: inicio, $lte: fin },
  });

  const entregados = enviosDelDia.filter(e => e.estadoId === "ENTREGADO").length;
  const pendientes = enviosDelDia.filter(e =>
    ["PENDIENTE", "ASIGNADO", "EN_CAMINO"].includes(e.estadoId)
  ).length;
  const cancelados = enviosDelDia.filter(e =>
    ["CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"].includes(e.estadoId)
  ).length;
  const gastoTotal = enviosDelDia.reduce((acc, e) => acc + (e.costo_estimado || 0), 0);

  await EstadisticaCliente.findOneAndUpdate(
    { clienteId: String(clienteId), fecha: inicio },
    {
      $set: {
        enviosTotales: enviosDelDia.length,
        enviosEntregados: entregados,
        enviosPendientes: pendientes,
        enviosCancelados: cancelados,
        gastoTotal,
      },
    },
    { upsert: true, new: true }
  );
}
/**
 * Llama esto al finalizar un viaje (finalizarViaje controller).
 * Upsert del registro diario del comisionista.
 */
export async function registrarEstadisticaViaje({ comisionistaId, fecha }) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  // Traer todos los registros del comisionista en ese día
  const registros = await EnvioXComisionista.find({
    comisionistaId,
    fecha_fin: { $gte: inicio, $lte: fin },
    estado_id: { $in: ["ENTREGADO", "DEVUELTO", "CANCELADO_RETORNO"] },
  });

  const entregas = registros.filter((r) => r.estado_id === "ENTREGADO").length;
  const retiros = registros.length; // todo retiro que pasó por fecha_retiro
  const ingresosTotales = registros.reduce(
    (acc, r) => acc + (r.precio_final || 0),
    0
  );
  const distanciaKm = registros.reduce(
    (acc, r) => acc + (r.distanciaKm || 0),
    0
  );

  await EstadisticaComisionista.findOneAndUpdate(
    { comisionistaId: String(comisionistaId), fecha: inicio },
    {
      $set: {
        entregas,
        retiros,
        ingresosTotales,
        distanciaKm,
        enviosTotales: registros.length,
      },
      $inc: { viajes: 0 }, // no incrementar en upsert
    },
    { upsert: true, new: true }
  );

  // Viajes: solo incrementar si es la primera vez que se registra ese día
  await EstadisticaComisionista.updateOne(
    {
      comisionistaId: String(comisionistaId),
      fecha: inicio,
      viajes: 0,
    },
    { $inc: { viajes: 1 } }
  );
}