//microservicios\envio-service\src\controllers\dashboardControllers.js
import Envio from '../models/envioModels.js';

// ─── GET /api/comisionista/dashboard/resumen ──────────────────────────────────
export const getDashboardResumen = async (req, res, next) => {
  console.log("[dashboard] userId:", req.userId, "rol:", req.userRol);
console.log("[dashboard] auth header:", req.headers.authorization?.slice(0, 25) + "...");
  try {
    const comisionistaId = req.userId;
    const hoy       = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
    const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

    const [enviosHoy, enRuta, pendientesRetiro] = await Promise.all([
      Envio.countDocuments({
        comisionistaId,
        fecha_entrega: { $gte: inicioDia, $lte: finDia },
        estadoId: { $in: ['ASIGNADO', 'EN_RETIRO', 'EN_CAMINO', 'ENTREGADO'] },
      }),
      Envio.countDocuments({
        comisionistaId,
        estadoId: { $in: ['EN_RETIRO', 'EN_CAMINO'] },
      }),
      Envio.countDocuments({
        comisionistaId,
        estadoId: 'ASIGNADO',
      }),
    ]);

    return res.status(200).json({
      enviosHoy,
      enRuta,
      pendientesRetiro,
      calificacion: null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/comisionista/dashboard/agenda ───────────────────────────────────
export const getAgendaHoy = async (req, res, next) => {
  console.log("[dashboard] userId:", req.userId, "rol:", req.userRol);
console.log("[dashboard] auth header:", req.headers.authorization?.slice(0, 25) + "...");
  try {
    const comisionistaId = req.userId;
    const dateStr   = req.query.date;
    const base      = dateStr ? new Date(dateStr) : new Date();
    const inicioDia = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0);
    const finDia    = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);

    const envios = await Envio.find({
      comisionistaId,
      fecha_entrega: { $gte: inicioDia, $lte: finDia },
      estadoId: { $in: ['ASIGNADO', 'EN_RETIRO', 'EN_CAMINO', 'DEMORADO'] },
    }).sort({ createdAt: 1 });

    const items = envios.map((e, index) => ({
      id:        String(e._id),
      orden:     index + 1,
      numero:    e.nro_envio,
      cliente:   String(e.usuarioId),
      destino: e.direccion_destino?.texto || e.destinoCiudad?.localidadNombre || "—",
localidad: e.destinoCiudad?.localidadNombre || "—",
      estado:    e.estadoId,
    }));

    return res.status(200).json({ items });
  } catch (err) {
    next(err);
  }
};