// controllers/estadisticasController.js
import EstadisticaComisionista from "../models/estadisticaComisionistaModel.js";
import Envio from "../models/envioModels.js";

export const getEstadisticasComisionista = async (req, res) => {
  try {
    const { comisionistaId } = req.params;

    const registros = await EstadisticaComisionista.find({
      comisionistaId: String(comisionistaId),
    }).sort({ fecha: 1 });

    // Totales acumulados
    const ingresosTotales = registros.reduce(
      (acc, r) => acc + (r.ingresosTotales || 0),
      0
    );
    const totalViajes = registros.reduce((acc, r) => acc + (r.viajes || 0), 0);
    const totalEntregas = registros.reduce(
      (acc, r) => acc + (r.entregas || 0),
      0
    );
    const totalRetiros = registros.reduce(
      (acc, r) => acc + (r.retiros || 0),
      0
    );
    const distanciaTotal = registros.reduce(
      (acc, r) => acc + (r.distanciaKm || 0),
      0
    );

    const ingresoPromedio =
      totalViajes > 0 ? ingresosTotales / totalViajes : 0;
    const distanciaPromedio =
      totalViajes > 0 ? distanciaTotal / totalViajes : 0;

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

    for (const r of registros) {
      const diaSemana = new Date(r.fecha).getDay();
      diasMap[diaSemana].entregas += r.entregas || 0;
    }

    // Ordenar Lun→Dom para el gráfico
    const diasMasEntregas = [1, 2, 3, 4, 5, 6, 0].map((d) => diasMap[d]);

    return res.json({
      ingresosTotales,
      ingresoPromedio,
      ingresoPromedioViaje: ingresoPromedio, // alias para el frontend
      distanciaPromedio,
      distanciaPromedioViaje: distanciaPromedio, // alias
      entregas: totalEntregas,
      retiros: totalRetiros,
      diasMasEntregas,
      comparativaEnvios: [
        { tipo: "Entregas", cantidad: totalEntregas },
        { tipo: "Retiros", cantidad: totalRetiros },
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

    const total = envios.length;
    const entregados = envios.filter((e) => e.estadoId === "ENTREGADO").length;
    const activos = envios.filter((e) =>
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
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("es-AR", { month: "short" }),
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