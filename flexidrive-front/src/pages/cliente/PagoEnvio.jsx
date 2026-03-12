import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../components/UI";
import Loader from "../../components/Loader";
import { mockPay } from "../../services/shipmentServices";

const moneyARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

export default function PagoEnvio() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("efectivo");
  const [loading, setLoading] = useState(false);

  const comi = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("draftComisionista") || "{}"); } catch { return {}; }
  }, []);

  const createdEnvio = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("createdEnvio") || "{}"); } catch { return {}; }
  }, []);

  async function pagar() {
    setLoading(true);
    try {
      await mockPay({ method });
      localStorage.setItem("draftPago", JSON.stringify({ method }));

      // ✅ Limpiar drafts recién acá, cuando el pago fue exitoso
      localStorage.removeItem("draftEnvio");
      localStorage.removeItem("draftEnvioPayloadBase");
      localStorage.removeItem("draftBusqueda");
      localStorage.removeItem("draftComisionista");

      const envioDoc = createdEnvio?.envio ?? createdEnvio;
      const shipmentId = envioDoc?._id || envioDoc?.id || "sin-id";
      navigate(`/cliente/envios/${shipmentId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      <h1 className="text-4xl font-bold text-slate-700">Método de pago</h1>

      <Card title="Total">
        <div className="flex items-center justify-between">
          <div className="text-slate-600">
            Comisionista: <b className="text-slate-800">{comi.nombre || "—"}</b>
          </div>
          {/* ✅ moneyARS en lugar de $ hardcodeado */}
          <div className="text-2xl font-bold text-slate-800">
            {comi.precioEstimado != null ? moneyARS(comi.precioEstimado) : "—"}
          </div>
        </div>
      </Card>

      <Card title="Elegí cómo pagar">
        <div className="space-y-4">
          <Option checked={method === "efectivo"} onSelect={() => setMethod("efectivo")} title="Efectivo" />
          <Option checked={method === "transferencia"} onSelect={() => setMethod("transferencia")} title="Transferencia" />
          <Option checked={method === "mercadopago"} onSelect={() => setMethod("mercadopago")} title="Mercado Pago" />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {/* ✅ Volver a confirmación SIN borrar drafts */}
          <Button variant="outline" onClick={() => navigate("/cliente/confirmacion-envio")}>Volver</Button>
          <Button onClick={pagar} disabled={loading}>
            {loading ? "Procesando..." : "Pagar"}
          </Button>
        </div>

        {loading && <div className="mt-6"><Loader label="Procesando pago..." /></div>}
      </Card>
    </div>
  );
}

function Option({ checked, onSelect, title }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left hover:bg-slate-50 ${checked ? "border-blue-700" : "border-slate-200"
        }`}
    >
      <div className="text-lg font-bold text-slate-700">{title}</div>
      <div className={`h-6 w-6 rounded-full border-4 ${checked ? "border-blue-700" : "border-slate-300"}`} />
    </button>
  );
}