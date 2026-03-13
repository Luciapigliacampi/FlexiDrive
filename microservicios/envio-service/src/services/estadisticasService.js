// services/estadisticaService.js
import EstadisticaComisionista from "../models/estadisticaComisionistaModel.js";
import Envio from "../models/envioModels.js";
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
        enviosTotales:    enviosDelDia.length,
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
 * Registra las estadísticas diarias del comisionista al finalizar un viaje.
 *
 * FIX: se reemplazó EnvioXComisionista (que requería fecha_fin seteada y tenía
 * estados distintos) por el modelo Envio, que es la fuente de verdad del estado
 * actual de cada envío y siempre tiene comisionistaId y costo_estimado.
 *
 * Se buscan todos los envíos del comisionista con fecha_retiro o fecha_entrega
 * dentro del día, o con estado terminal (ENTREGADO / DEVUELTO / CANCELADO_RETORNO)
 * y updatedAt dentro del día — así se capturan los completados en cualquiera de
 * los dos flujos (manual o automático).
 */
export async function registrarEstadisticaViaje({ comisionistaId, fecha }) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  // Envíos del comisionista que se movieron hoy (retiro o entrega en el día,
  // o cuyo estado terminal se registró hoy).
  const enviosDelDia = await Envio.find({
    comisionistaId: String(comisionistaId),
    eliminado: { $ne: true },
    $or: [
      { fecha_retiro:  { $gte: inicio, $lte: fin } },
      { fecha_entrega: { $gte: inicio, $lte: fin } },
      {
        estadoId: { $in: ["ENTREGADO", "DEVUELTO", "CANCELADO_RETORNO"] },
        updatedAt: { $gte: inicio, $lte: fin },
      },
    ],
  });

  const entregas = enviosDelDia.filter(e => e.estadoId === "ENTREGADO").length;
  // Un retiro se contabiliza si el envío llegó al menos a estado RETIRADO/EN_CAMINO
  // o cualquier estado posterior — es decir, fue físicamente retirado hoy.
  const retiros = enviosDelDia.filter(e =>
    ["RETIRADO", "EN_CAMINO", "ENTREGADO", "DEMORADO_ENTREGA",
     "DEVUELTO", "CANCELADO_RETORNO"].includes(e.estadoId) &&
    e.fecha_retiro >= inicio && e.fecha_retiro <= fin
  ).length;

  const ingresosTotales = enviosDelDia
    .filter(e => e.estadoId === "ENTREGADO")
    .reduce((acc, e) => acc + (e.costo_estimado || 0), 0);

  // distanciaKm: si el modelo Envio no lo tiene, queda en 0 hasta que
  // EnvioXComisionista lo informe correctamente.
  const distanciaKm = enviosDelDia.reduce((acc, e) => acc + (e.distanciaKm || 0), 0);

  await EstadisticaComisionista.findOneAndUpdate(
    { comisionistaId: String(comisionistaId), fecha: inicio },
    {
      $set: {
        entregas,
        retiros,
        ingresosTotales,
        distanciaKm,
        enviosTotales: enviosDelDia.length,
      },
      $inc: { viajes: 0 }, // no incrementar en upsert
    },
    { upsert: true, new: true }
  );

  // Incrementar viajes solo si el registro era nuevo (viajes === 0 tras el upsert)
  await EstadisticaComisionista.updateOne(
    { comisionistaId: String(comisionistaId), fecha: inicio, viajes: 0 },
    { $inc: { viajes: 1 } }
  );
}
