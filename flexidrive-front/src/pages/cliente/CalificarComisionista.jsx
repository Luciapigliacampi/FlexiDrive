import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, Button } from "../../components/UI";
import RatingStars from "../../components/RatingStars";
import { mockRate } from "../../services/shipmentServices";

export default function CalificarComisionista() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function submit() {
    await mockRate({ id, rating, comment });
    navigate(`/cliente/envios/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">Calificar comisionista</h1>

      <Card title={`Envío #${id}`}>
        <p className="text-slate-600">Elegí una calificación y dejá un comentario (opcional).</p>

        <div className="mt-4">
          <RatingStars value={rating} onChange={setRating} />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentario..."
          className="mt-5 min-h-[120px] w-full rounded-xl border px-4 py-3 outline-none"
        />

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={submit}>Enviar calificación</Button>
        </div>
      </Card>
    </div>
  );
}
