import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../components/UI";
import Loader from "../../components/Loader";
import { mockPay } from "../../services/shipmentServices";

export default function PagoEnvio() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("efectivo");
  const [loading, setLoading] = useState(false);

  const comi = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("draftComisionista") || "{}"); } catch { return {}; }
  }, []);

  async function pagar() {
    setLoading(true);
    try {
      await mockPay({ method });
      localStorage.setItem("draftPago", JSON.stringify({ method }));

      const shipmentId = localStorage.getItem("draftShipmentId") || "2542";
      navigate(`/cliente/envios/${shipmentId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">Método de pago</h1>

      <Card title="Total estimado">
        <div className="flex items-center justify-between">
          <div className="text-slate-600">
            Comisionista: <b className="text-slate-800">{comi.nombre || "—"}</b>
          </div>
          <div className="text-2xl font-bold text-slate-800">${comi.precioEstimado ?? "—"}</div>
        </div>
      </Card>

      <Card title="Elegí cómo pagar">
        <div className="space-y-4">
          <Option checked={method==="efectivo"} onSelect={()=>setMethod("efectivo")} title="Efectivo" desc="" />
          <Option checked={method==="transferencia"} onSelect={()=>setMethod("transferencia")} title="Transferencia" desc="" />
          <Option checked={method==="mercadopago"} onSelect={()=>setMethod("mercadopago")} title="Mercado Pago" desc="" />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/cliente/confirmacion-envio")}>Volver</Button>
          <Button onClick={pagar} disabled={loading}>
            {loading ? "Procesando..." : "Pagar"}
          </Button>
        </div>

        {loading ? <div className="mt-6"><Loader label="Procesando pago..." /></div> : null}
      </Card>
    </div>
  );
}

function Option({ checked, onSelect, title, desc }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left hover:bg-slate-50 ${checked ? "border-blue-700" : "border-slate-200"}`}
    >
      <div>
        <div className="text-lg font-bold text-slate-700">{title}</div>
        <div className="text-slate-500">{desc}</div>
      </div>
      <div className={`h-6 w-6 rounded-full border-4 ${checked ? "border-blue-700" : "border-slate-300"}`} />
    </button>
  );
}
