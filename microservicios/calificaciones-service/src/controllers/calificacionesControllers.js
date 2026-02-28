import Calificacion from '../models/calificacionModel.js';
import axios from 'axios';

export const crearCalificacion = async (req, res, next) => {
    try {
        const { envioId, puntuacion, comentario } = req.body;
        const emisorId = req.userId; // Viene del token de Ana

        // 1. Verificar si el envío ya fue calificado
        const existe = await Calificacion.findOne({ envioId });
        if (existe) return res.status(400).json({ message: "Este envío ya fue calificado." });

        // 2. Consultar datos del envío al Micro de Envíos para obtener el receptorId (Marta)
        const resEnvio = await axios.get(`http://localhost:3001/api/envios/${envioId}`, {
            headers: { Authorization: req.headers.authorization }
        });
        const envio = resEnvio.data;

        // 🛡️ --- NUEVA VALIDACIÓN DE SEGURIDAD --- 🛡️
        // Comparamos el usuarioId del envío con el emisorId del token
        if (envio.usuarioId !== emisorId) {
            return res.status(403).json({ 
                message: "Acceso denegado: No puedes calificar un envío que no te pertenece." 
            });
        }

        if (envio.estadoId !== 'ENTREGADO') {
            return res.status(400).json({ message: "Solo puedes calificar envíos entregados." });
        }

        // 3. Crear la calificación
        const nuevaCalificacion = new Calificacion({
            envioId,
            emisorId,
            receptorId: envio.comisionistaId,
            puntuacion,
            comentario
        });

        await nuevaCalificacion.save();

        // 4. Calcular el nuevo promedio de este comisionista
        const todasLasCalificaciones = await Calificacion.find({ receptorId: envio.comisionistaId });
        const nuevoPromedio = todasLasCalificaciones.reduce((acc, c) => acc + c.puntuacion, 0) / todasLasCalificaciones.length;

        // 5. Notificar al Micro de Auth (Puerto 3000)
        try {
            await axios.patch(`http://localhost:3000/api/auth/update-reputacion/${envio.comisionistaId}`,
                { promedio: nuevoPromedio.toFixed(1) },
                { headers: { Authorization: req.headers.authorization } }
            );
            console.log("✅ Promedio actualizado en Micro de Auth");
        } catch (error) {
            console.error("⚠️ No se pudo actualizar el promedio en Auth, pero la calificación se guardó.");
        }
        res.status(201).json({ message: "Calificación enviada con éxito", calificacion: nuevaCalificacion });
    } catch (error) {
        next(error);
    }
};

export const getReputacionComisionista = async (req, res, next) => {
    try {
        const { id } = req.params;
        const calificaciones = await Calificacion.find({ receptorId: id });

        const promedio = calificaciones.length > 0
            ? calificaciones.reduce((acc, c) => acc + c.puntuacion, 0) / calificaciones.length
            : 5; // Puntaje inicial si es nuevo

        res.status(200).json({
            comisionistaId: id,
            promedio: promedio.toFixed(1),
            totalVotos: calificaciones.length,
            comentarios: calificaciones.map(c => ({ comentario: c.comentario, puntos: c.puntuacion }))
        });
    } catch (error) {
        next(error);
    }
};