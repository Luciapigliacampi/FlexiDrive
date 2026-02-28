//microservicios\ia-route-service\src\controllers\routeControllers.js
import axios from 'axios';
import RutaOptima from '../models/rutaOptimaModel.js';


export const getAddressSuggestions = async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) return res.status(400).json({ message: "Falta el texto de búsqueda" });

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input: input,
        key: process.env.GOOGLE_MAPS_API_KEY,
        language: 'es',
        components: 'country:ar' // Filtra solo para Argentina
      }
    }
    );

    res.json(response.data.predictions);
  } catch (error) {
    res.status(500).json({ message: "Error al conectar con Google Maps" });
  }
};

export const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`, {
      params: {
        place_id: placeId,
        fields: 'geometry', // Solo pedimos la ubicación para no gastar de más
        key: apiKey
      }
    }
    );

    const location = response.data.result.geometry.location;
    res.json({
      lat: location.lat,
      lng: location.lng
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener coordenadas" });
  }
};



// 1. OBTENER LA RUTA ACTIVA (Para consultar lo que ya existe)
export const getRutaActiva = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    // SEGURIDAD EXTRA: Marta solo puede ver SU ruta activa, no la de otros.
    // req.userId viene del authMiddleware
    if (comisionistaId !== req.userId && req.userRol !== 'admin') {
        return res.status(403).json({ message: "No tienes permiso para ver la ruta de otro comisionista." });
    }

    // Buscamos la ruta marcada como activa para ese comisionista
    // Ordenamos por la más reciente
    const ruta = await RutaOptima.findOne({
      comisionistaId,
      activo: true
    }).sort({ createdAt: -1 });

    if (!ruta) {
      return res.status(404).json({ message: "No tienes una ruta activa generada para hoy." });
    }

    res.status(200).json(ruta);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la ruta activa" });
  }
};

// 2. GENERAR NUEVA RUTA (Llamada a la IA de Google)
export const generarRutaParaComisionista = async (req, res) => {
  try {
    const { comisionistaId } = req.params;
    // Recibimos fecha y opcionalmente lat/lng del GPS del navegador
    const { fecha, latActual, lngActual } = req.query;

    // SEGURIDAD: Validamos que Marta sea quien dice ser
    if (comisionistaId !== req.userId) {
        return res.status(403).json({ message: "Solo puedes generar tu propia hoja de ruta." });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // A. CONSULTAR AL MICRO DE ENVÍOS
    const token = req.headers.authorization; // Recuperamos el token que mandó Marta

    const urlEnvios = `http://localhost:3001/api/envios/agenda/${comisionistaId}?fecha=${fecha}`;
    const respuesta = await axios.get(urlEnvios, {
      headers: { Authorization: token } // <-- PASAMOS EL TOKEN AL OTRO MICRO
    });
    const envios = respuesta.data;

    if (!envios || envios.length === 0) {
      return res.status(404).json({ message: "No se encontraron envíos para este comisionista en la fecha indicada." });
    }

    // B. FILTRADO INTELIGENTE DE PARADAS
    const paradas = envios.map(envio => {
      // Definimos qué estados significan que el paquete aún NO está con Marta
      const todaviaNoLoTiene = ['ASIGNADO', 'EN_RETIRO'].includes(envio.estadoId);

      // Si el estado es 'CANCELADO_RETORNO', el destino vuelve a ser el Origen
      const esRetorno = envio.estadoId === 'CANCELADO_RETORNO';
      return {
        envioId: envio._id,
        // Si no lo tiene o es retorno, va al origen. Si ya lo tiene, va al destino.
        lat: (todaviaNoLoTiene || esRetorno) ? envio.direccion_origen.lat : envio.direccion_destino.lat,
        lng: (todaviaNoLoTiene || esRetorno) ? envio.direccion_origen.lng : envio.direccion_destino.lng,
        texto: (todaviaNoLoTiene || esRetorno) ? envio.direccion_origen.texto : envio.direccion_destino.texto,
        tipo: todaviaNoLoTiene ? 'RETIRO' : (esRetorno ? 'RETORNO' : 'ENTREGA'),
        nro_envio: envio.nro_envio // Agregamos esto para que sea fácil identificarlo
      };
    });

    // C. CONFIGURAR ORIGEN (Ubicación actual o primera parada)
    const puntoDeInicio = (latActual && lngActual)
      ? `${latActual},${lngActual}`
      : `${paradas[0].lat},${paradas[0].lng}`;

    const destinosIntermedios = paradas.map(p => `${p.lat},${p.lng}`).join('|');

    // D. LLAMADA A GOOGLE DIRECTIONS (IA de Optimización)
    const googleRes = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: puntoDeInicio,
        destination: puntoDeInicio, // Opcional: vuelve al punto de inicio al terminar
        waypoints: `optimize:true|${destinosIntermedios}`,
        key: apiKey,
        mode: 'driving',
        language: 'es'
      }
    });

    if (googleRes.data.status !== 'OK') {
      return res.status(500).json({ message: "Error de Google Maps", detail: googleRes.data.status });
    }

    const route = googleRes.data.routes[0];
    const ordenIndices = route.waypoint_order;

    // E. MAPEAR RESULTADOS AL MODELO
    const ordenEntregasFinal = ordenIndices.map((indiceOriginal, i) => ({
      envioId: paradas[indiceOriginal].envioId,
      nro_envio: paradas[indiceOriginal].nro_envio, // Muy útil para el Front
      orden: i + 1,
      tipo: paradas[indiceOriginal].tipo, // RETIRO o ENTREGA
      lat: paradas[indiceOriginal].lat,
      lng: paradas[indiceOriginal].lng
    }));

    // F. PERSISTENCIA EN MONGO
    // Desactivamos rutas previas
    await RutaOptima.updateMany({ comisionistaId, activo: true }, { activo: false });

    const nuevaRuta = new RutaOptima({
      comisionistaId,
      fecha_generada: new Date(fecha),
      orden_entregas: ordenEntregasFinal,
      polyline: route.overview_polyline.points,
      distancia_total_km: route.legs.reduce((acc, leg) => acc + leg.distance.value, 0) / 1000,
      tiempo_estimado_min: route.legs.reduce((acc, leg) => acc + leg.duration.value, 0) / 60,
      activo: true
    });

    await nuevaRuta.save();
    res.status(200).json(nuevaRuta);

  } catch (error) {
    console.error("Error en generarRuta:", error);
    res.status(500).json({ message: "Error interno al generar la ruta" });
  }
};

export const getSeguimientoEnvio = async (req, res) => {
  try {
    const { envioId } = req.params;
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "No se proporcionó un token de seguridad" });
    }

    // 1. Pedimos el envío al Micro de Envíos
    const respuestaEnvio = await axios.get(`http://localhost:3001/api/envios/${envioId}`, {
      headers: { Authorization: token }
    });
    const envio = respuestaEnvio.data;

    // --- LÓGICA DE POLYLINE INTELIGENTE ---
    // Intentamos usar la que ya tiene el envío (si existe el campo en tu DB de Envíos)
    let polyline = envio.polyline_especifica || "";

    if (!polyline) {
      const { lat: latO, lng: lngO } = envio.direccion_origen;
      const { lat: latD, lng: lngD } = envio.direccion_destino;
      const key = process.env.GOOGLE_MAPS_API_KEY;

      // Determinamos el sentido según el estado
      // Si es CANCELADO_RETORNO o similar, invertimos los puntos
      const esRetorno = envio.estadoId === 'CANCELADO_RETORNO' || envio.estadoId === 'DEVUELTO';
      const origenStr = esRetorno ? `${latD},${lngD}` : `${latO},${lngO}`;
      const destinoStr = esRetorno ? `${latO},${lngO}` : `${latD},${lngD}`;

      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origenStr}&destination=${destinoStr}&key=${key}`;

        const resGoogle = await axios.get(googleUrl);

        if (resGoogle.data.status === "OK") {
          polyline = resGoogle.data.routes[0].overview_polyline.points;
          console.log(`✅ Polyline (${esRetorno ? 'Retorno' : 'Ida'}) generada y lista para guardar.`);

          // 2. GUARDADO: Le avisamos al Micro de Envíos que guarde la polyline para la próxima vez
          // Nota: Asegúrate de que el Micro de Envíos acepte este campo en su modelo/esquema
          await axios.patch(`http://localhost:3001/api/envios/${envioId}`,
            { polyline_especifica: polyline },
            { headers: { Authorization: token } }
          ).catch(err => console.log("⚠️ No se pudo persistir la polyline en el Micro de Envíos (quizás falta el campo en el modelo), pero la respuesta sigue."));

        } else {
          console.error("❌ Google Maps respondió:", resGoogle.data.status);
        }
      } catch (error) {
        console.error("❌ Error llamando a Google:", error.message);
      }
    } else {
      console.log("🚀 Usando polyline existente de la base de datos.");
    }

    // --- DATOS DEL COMISIONISTA ---
    let datosComisionista = null;
    if (envio.comisionistaId) {
      const resUser = await axios.get(`http://localhost:3000/api/auth/${envio.comisionistaId}`, {
        headers: { Authorization: token }
      });
      const usuario = resUser.data;

      datosComisionista = {
        nombreCompleto: `${usuario.nombre} ${usuario.apellido}`,
        telefono: usuario.telefono,
        foto: "https://via.placeholder.com/150"
      };
    }

    // 3. Respuesta final enriquecida
    res.json({
      nro_envio: envio.nro_envio,
      estado: envio.estadoId,
      es_demorado: envio.estadoId === 'DEMORADO', // Flag por si quieres poner un cartel de advertencia
      es_retorno: envio.estadoId === 'CANCELADO_RETORNO',
      fechas: {
  entrega_estimada: envio.fecha_entrega,
  franja_retiro: envio.franja_horaria_retiro || "—",
  // fecha_retiro: cuándo el comisionista confirmó que retira (puede ser null)
  retiro_confirmado: envio.fecha_retiro || null,
  actualizado: envio.updatedAt,
},
      detalles: {
        origen: envio.direccion_origen.texto,
        destino: envio.direccion_destino.texto,
        notas: envio.notas_adicionales,
        paquetes: envio.paquetes.length
      },
      comisionista: datosComisionista,
      mapa: {
        lat_origen: envio.direccion_origen.lat,
        lng_origen: envio.direccion_origen.lng,
        lat_destino: envio.direccion_destino.lat,
        lng_destino: envio.direccion_destino.lng,
        polyline: polyline,

      }
    });

  } catch (error) {
    console.error("ERROR DETALLADO:", error.response ? error.response.data : error.message);
    res.status(500).json({
      message: "Error al obtener el seguimiento",
      error_real: error.message
    });
  }
};