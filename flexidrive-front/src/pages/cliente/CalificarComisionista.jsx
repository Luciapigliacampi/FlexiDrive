// flexidrive-front/src/pages/cliente/CalificarComisionista.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, Button } from "../../components/UI";
import RatingStars from "../../components/RatingStars";
import { calificarEnvio, actualizarCalificacion } from "../../services/shipmentServices";
import api from "../../services/api";

export default function CalificarComisionista() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExistente, setLoadingExistente] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [esModificacion, setEsModificacion] = useState(false);

  // Al montar, verificar si ya existe calificación
  useEffect(() => {
    const CAL_BASE = import.meta.env.VITE_CALIFICACIONES_API_URL || "http://localhost:3003";
    api.get(`${CAL_BASE}/api/calificaciones/envio/${id}`)
      .then((r) => {
        setRating(r.data.puntuacion);
        setComment(r.data.comentario || "");
        setEsModificacion(true);
      })
      .catch(() => {}) // 404 = no calificado aún, no pasa nada
      .finally(() => setLoadingExistente(false));
  }, [id]);

  async function submit() {
    if (!rating || rating < 1) {
      setError("Por favor seleccioná una calificación.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (esModificacion) {
        await actualizarCalificacion({ id, rating, comment });
      } else {
        await calificarEnvio({ id, rating, comment });
      }
      setSuccess(true);
      setTimeout(() => navigate(`/cliente/envios/${id}`), 1800);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Error al enviar la calificación.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingExistente) return (
    <div className="flex items-center justify-center h-64 text-slate-500">Cargando...</div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">
        {esModificacion ? "Modificar calificación" : "Calificar comisionista"}
      </h1>

      <Card title={`Envío #${id}`}>
        {esModificacion && (
          <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
            Ya calificaste este envío. Podés modificar tu calificación.
          </div>
        )}

        <p className="text-slate-600">Elegí una calificación y dejá un comentario (opcional).</p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{esModificacion ? "¡Calificación actualizada!" : "¡Calificación enviada!"} Redirigiendo...</span>
          </div>
        )}

        <div className="mt-4">
          <RatingStars value={rating} onChange={setRating} />
          <p className="mt-1 text-xs text-slate-400">Puntuación seleccionada: <strong>{rating}</strong> / 5</p>
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentario opcional sobre la entrega..."
          maxLength={200}
          disabled={loading || success}
          className="mt-5 min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 disabled:opacity-50"
        />
        <p className="text-right text-xs text-slate-400">{comment.length}/200</p>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={loading || success}>Cancelar</Button>
          <Button onClick={submit} disabled={loading || success}>
            {loading ? "Enviando..." : esModificacion ? "Actualizar calificación" : "Enviar calificación"}
          </Button>
        </div>
      </Card>
    </div>
  );
}