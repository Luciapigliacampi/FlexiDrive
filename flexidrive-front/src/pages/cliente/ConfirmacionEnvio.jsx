import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../components/UI";

export default function ConfirmacionEnvio() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  const draft = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("draftEnvio") || "{}"); } catch { return {}; }
  }, []);

  const comi = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("draftComisionista") || "{}"); } catch { return {}; }
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">Confirmación de envío</h1>

      <Card title="Resumen">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-slate-700">
          <div><b>Origen:</b> {draft.origen || "—"}</div>
          <div><b>Destino:</b> {draft.direccion || "—"} {draft.ciudad ? `(${draft.ciudad})` : ""}</div>
          {/* ✅ fecha_entrega y franja horaria por separado */}
          <div><b>Fecha de entrega:</b> {draft.fechaEntrega || "—"}</div>
          <div><b>Disponible para retiro:</b> {draft.franjaHorariaRetiro || "—"}</div>
          <div><b>Comisionista:</b> {comi.nombre || "—"}</div>
          {comi.precioEstimado != null && (
            <div><b>Precio estimado:</b> ${comi.precioEstimado}</div>
          )}
        </div>
      </Card>

      <Card title="Términos">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span className="text-slate-600">
            Acepto los términos del servicio y confirmo que los datos del envío son correctos.
          </span>
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/cliente/seleccionar-comisionista")}>Volver</Button>
          <Button disabled={!accepted} onClick={() => navigate("/cliente/pago")}>Continuar a pago</Button>
        </div>
      </Card>
    </div>
  );
}