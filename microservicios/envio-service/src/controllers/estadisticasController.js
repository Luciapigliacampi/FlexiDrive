// controllers/estadisticasController.js
import EstadisticaComisionista from "../models/estadisticaComisionistaModel.js";
import Envio from "../models/envioModels.js";

// ── Estadísticas del comisionista (tiempo real) ───────────────────────────────

export const getEstadisticasComisionista = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    const { desde, hasta } = req.query;

    // Rango de fechas — si no viene, trae todo
    const filtroFecha = {};
    if (desde || hasta) {
      filtroFecha.createdAt = {};
      if (desde) filtroFecha.createdAt.$gte = new Date(desde);
      if (hasta) {
        const fin = new Date(hasta);
        fin.setHours(23, 59, 59, 999);
        filtroFecha.createdAt.$lte = fin;
      }
    }

    // Traer todos los envíos del comisionista en el rango
    const envios = await Envio.find({
      comisionistaId: String(comisionistaId),
      eliminado: { $ne: true },
      ...filtroFecha,
    });

    const totalEntregas = envios.filter((e) => e.estadoId === "ENTREGADO").length;
    const totalRetiros  = envios.filter((e) =>
      ["RETIRADO", "EN_CAMINO", "ENTREGADO", "DEMORADO_ENTREGA",
       "DEVUELTO", "CANCELADO_RETORNO"].includes(e.estadoId)
    ).length;

    // Ingresos: solo envíos efectivamente entregados
    const ingresosTotales = envios
      .filter((e) => e.estadoId === "ENTREGADO")
      .reduce((acc, e) => acc + (e.costo_estimado || 0), 0);

    // Viajes: días distintos con al menos un envío entregado
    const diasConEntrega = new Set(
      envios
        .filter((e) => e.estadoId === "ENTREGADO")
        .map((e) => {
          const d = new Date(e.updatedAt || e.createdAt);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
    );
    const totalViajes = diasConEntrega.size || 1; // evitar división por 0

    const ingresoPromedio   = ingresosTotales / totalViajes;
    const distanciaTotal    = envios.reduce((acc, e) => acc + (e.distanciaKm || 0), 0);
    const distanciaPromedio = distanciaTotal / totalViajes;

    // Días de más entregas — agrupar por día de la semana
    const diasMap = {
      0: { dia: "Dom", entregas: 0 },
      1: { dia: "Lun", entregas: 0 },
      2: { dia: "Mar", entregas: 0 },
      3: { dia: "Mié", entregas: 0 },
      4: { dia: "Jue", entregas: 0 },
      5: { dia: "Vie", entregas: 0 },
      6: { dia: "Sáb", entregas: 0 },
    };

    for (const e of envios) {
      if (e.estadoId !== "ENTREGADO") continue;
      const diaSemana = new Date(e.updatedAt || e.createdAt).getDay();
      diasMap[diaSemana].entregas += 1;
    }

    // Ordenar Lun→Dom para el gráfico
    const diasMasEntregas = [1, 2, 3, 4, 5, 6, 0].map((d) => diasMap[d]);

    return res.json({
      ingresosTotales,
      ingresoPromedio,
      ingresoPromedioViaje:   ingresoPromedio,
      distanciaPromedio,
      distanciaPromedioViaje: distanciaPromedio,
      entregas:               totalEntregas,
      retiros:                totalRetiros,
      diasMasEntregas,
      comparativaEnvios: [
        { tipo: "Entregas", cantidad: totalEntregas },
        { tipo: "Retiros",  cantidad: totalRetiros  },
      ],
    });
  } catch (error) {
    console.error("Error en getEstadisticasComisionista:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ── Estadísticas del cliente ──────────────────────────────────────────────────

export const getEstadisticasCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;

    const envios = await Envio.find({
      usuarioId: clienteId,
      eliminado: { $ne: true },
    }).select("estadoId createdAt costo_estimado destinoCiudad");

    const total      = envios.length;
    const entregados = envios.filter((e) => e.estadoId === "ENTREGADO").length;
    const activos    = envios.filter((e) =>
      ["PENDIENTE", "ASIGNADO", "EN_CAMINO", "RETIRADO",
       "EN_RETIRO", "DEMORADO_RETIRO", "DEMORADO_ENTREGA"].includes(e.estadoId)
    ).length;
    const cancelados = envios.filter((e) =>
      ["CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"].includes(e.estadoId)
    ).length;

    const gastoTotal = envios.reduce(
      (acc, e) => acc + (e.costo_estimado || 0),
      0
    );

    // Envíos por mes (últimos 6 meses)
    const ahora = new Date();
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1);
      return {
        key:      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label:    d.toLocaleString("es-AR", { month: "short" }),
        cantidad: 0,
      };
    });

    for (const envio of envios) {
      const key = `${new Date(envio.createdAt).getFullYear()}-${String(
        new Date(envio.createdAt).getMonth() + 1
      ).padStart(2, "0")}`;
      const mes = meses.find((m) => m.key === key);
      if (mes) mes.cantidad += 1;
    }

    // Destinos más frecuentes
    const destinoCount = {};
    for (const envio of envios) {
      const nombre = envio.destinoCiudad?.localidadNombre;
      if (nombre) destinoCount[nombre] = (destinoCount[nombre] || 0) + 1;
    }
    const destinosFrecuentes = Object.entries(destinoCount)
      .map(([destino, cantidad]) => ({ destino, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    return res.json({
      total,
      entregados,
      activos,
      cancelados,
      gastoTotal,
      enviosPorMes: meses,
      destinosFrecuentes,
    });
  } catch (error) {
    console.error("Error en getEstadisticasCliente:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
