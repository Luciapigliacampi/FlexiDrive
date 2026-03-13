// src/pages/cliente/ConfirmacionEnvio.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../components/UI";
import {
  crearEnvio,
  confirmarComisionistaEnEnvio,
  mockPay,
} from "../../services/shipmentServices";

const LS_BANK_KEY = "flexidrive_datos_bancarios_comisionista";

const moneyARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

function safeJsonParse(value, fallback = {}) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function getApiErrorMessage(err, fallback = "Ocurrió un error.") {
  const data = err?.response?.data;
  if (Array.isArray(data?.detalles) && data.detalles.length > 0) {
    return data.detalles.map((d) => `${d.campo}: ${d.mensaje}`).join("\n");
  }
  return data?.error || data?.message || err?.message || fallback;
}

function resolveMediosPago(comi) {
  const saved = safeJsonParse(localStorage.getItem(LS_BANK_KEY), {});

  return {
    aceptaEfectivo: Boolean(
      comi?.aceptaEfectivo ??
        comi?.mediosPago?.aceptaEfectivo ??
        saved?.aceptaEfectivo
    ),
    aceptaTransferencia: Boolean(
      comi?.aceptaTransferencia ??
        comi?.mediosPago?.aceptaTransferencia ??
        saved?.aceptaTransferencia
    ),
  };
}

export default function ConfirmacionEnvio() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openTerms, setOpenTerms] = useState(false);
  const [method, setMethod] = useState("");

  const draft = useMemo(() => {
    return safeJsonParse(localStorage.getItem("draftEnvio"), {});
  }, []);

  const payload = useMemo(() => {
    return safeJsonParse(localStorage.getItem("draftEnvioPayloadBase"), {});
  }, []);

  const comi = useMemo(() => {
    return safeJsonParse(localStorage.getItem("draftComisionista"), {});
  }, []);

  const mediosPago = useMemo(() => resolveMediosPago(comi), [comi]);

  const metodosDisponibles = useMemo(() => {
    const items = [];

    if (mediosPago.aceptaEfectivo) {
      items.push(
        { value: "efectivoOrigen", title: "Efectivo en origen" },
        { value: "efectivoDestino", title: "Efectivo en destino" }
      );
    }

    if (mediosPago.aceptaTransferencia) {
      items.push({ value: "transferencia", title: "Transferencia" });
    }

    return items;
  }, [mediosPago]);

  const tieneMediosDisponibles = metodosDisponibles.length > 0;

  const origen = payload.direccion_origen?.texto || "—";
  const destino = payload.direccion_destino?.texto || "—";
  const origenCiudad = payload.origenCiudad?.localidadNombre || "";
  const destinoCiudad = payload.destinoCiudad?.localidadNombre || "";

  useEffect(() => {
    if (!tieneMediosDisponibles) {
      setMethod("");
      return;
    }

    const methodDisponible = metodosDisponibles.some((m) => m.value === method);

    if (!methodDisponible) {
      setMethod(metodosDisponibles[0].value);
    }
  }, [tieneMediosDisponibles, metodosDisponibles, method]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setOpenTerms(false);
    }

    if (openTerms) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [openTerms]);

  async function confirmarYPagar() {
    if (!accepted) return;

    if (!tieneMediosDisponibles) {
      setError(
        "El comisionista seleccionado no tiene medios de pago habilitados."
      );
      return;
    }

    if (!method) {
      setError("Seleccioná un medio de pago.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payloadBase = safeJsonParse(
        localStorage.getItem("draftEnvioPayloadBase"),
        {}
      );
      const comiData = safeJsonParse(
        localStorage.getItem("draftComisionista"),
        {}
      );

      if (!payloadBase?.direccion_origen || !payloadBase?.direccion_destino) {
        throw new Error(
          "No se encontró el payload del envío. Volvé a Solicitar envío."
        );
      }

      payloadBase.metodo_pago_cliente = method;

      const created = await crearEnvio(payloadBase);
      const createdObj = created?.data ?? created;
      const envioDoc = createdObj?.envio ?? createdObj;
      const envioId = envioDoc?._id || envioDoc?.id;

      if (!envioId) throw new Error("No se pudo crear el envío.");

      localStorage.setItem("createdEnvio", JSON.stringify(createdObj));

      await confirmarComisionistaEnEnvio(envioId, {
        tripPlanId: comiData.tripPlanId,
        comisionistaId: comiData.id,
      });

      await mockPay({ method });
      localStorage.setItem("draftPago", JSON.stringify({ method }));

      localStorage.removeItem("draftEnvio");
      localStorage.removeItem("draftEnvioPayloadBase");
      localStorage.removeItem("draftBusqueda");
      localStorage.removeItem("draftComisionista");

      navigate(`/cliente/envios/${envioId}`);
    } catch (e) {
      setError(getApiErrorMessage(e, "No se pudo confirmar el envío."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-4xl font-bold text-slate-700">
        Confirmación de envío
      </h1>

      <Card title="Resumen">
        <div className="grid grid-cols-1 gap-4 text-slate-700 md:grid-cols-2">
          <div>
            <b>Origen:</b> {origen} {origenCiudad && `(${origenCiudad})`}
          </div>
          <div>
            <b>Destino:</b> {destino} {destinoCiudad && `(${destinoCiudad})`}
          </div>
          <div>
            <b>Fecha de entrega:</b> {draft.fechaEntrega || "—"}
          </div>
          <div>
            <b>Disponible para retiro:</b> {draft.franjaHorariaRetiro || "—"}
          </div>
          <div>
            <b>Comisionista:</b> {comi.nombre || "—"}
          </div>
          {comi.precioEstimado != null && (
            <div className="text-2xl font-bold text-slate-800">
              <b>Precio estimado:</b>{" "}
              {comi.precioEstimado != null
                ? moneyARS(comi.precioEstimado)
                : "—"}
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">
          {error}
        </div>
      )}

      <Card title="Elegí cómo pagar">
        {!tieneMediosDisponibles ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            El comisionista seleccionado no tiene medios de pago habilitados.
          </div>
        ) : (
          <div className="space-y-4">
            {metodosDisponibles.map((item) => (
              <PayOption
                key={item.value}
                checked={method === item.value}
                onSelect={() => setMethod(item.value)}
                title={item.title}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title="Términos">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span className="text-slate-600">
            Acepto los{" "}
            <button
              type="button"
              className="text-blue-600 underline underline-offset-4 hover:text-blue-700"
              onClick={() => setOpenTerms(true)}
            >
              términos del servicio
            </button>{" "}
            y confirmo que los datos del envío son correctos.
          </span>
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/cliente/seleccionar-comisionista")}
          >
            Volver
          </Button>

          <Button
            disabled={!accepted || loading || !tieneMediosDisponibles || !method}
            onClick={confirmarYPagar}
          >
            {loading ? "Confirmando..." : "Confirmar envío"}
          </Button>
        </div>
      </Card>

      {openTerms && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenTerms(false);
          }}
        >
          <div className="absolute inset-0 bg-black/50" />

          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2
                id="terms-title"
                className="text-lg font-semibold text-slate-800"
              >
                Términos y Condiciones del Servicio
              </h2>
              <button
                type="button"
                className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100"
                onClick={() => setOpenTerms(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-slate-700">
              <div className="space-y-4">
                <p>
                  Al confirmar este envío, el usuario declara haber leído y
                  aceptado los siguientes términos y condiciones:
                </p>

                <div>
                  <h3 className="font-semibold">1. Naturaleza del servicio</h3>
                  <p>
                    FlexiDrive es una plataforma digital que conecta clientes con
                    comisionistas independientes para el traslado de paquetes
                    entre localidades previamente definidas por el comisionista.
                    FlexiDrive no actúa como empresa transportista, sino como
                    intermediario tecnológico.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">2. Información del envío</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      La información ingresada (retiro, entrega, fecha,
                      destinatario y bultos) es correcta y veraz.
                    </li>
                    <li>
                      El paquete no contiene elementos prohibidos por la ley.
                    </li>
                    <li>
                      El contenido cumple con normativas vigentes en la República
                      Argentina.
                    </li>
                  </ul>
                  <p className="mt-2">
                    Cualquier error en los datos proporcionados podrá generar
                    demoras o cancelaciones del servicio.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">3. Precio del servicio</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      El precio se calcula según la localidad de destino y la
                      cantidad de bultos.
                    </li>
                    <li>
                      El comisionista puede establecer descuentos por volumen.
                    </li>
                    <li>
                      El precio final informado antes de confirmar el envío es el
                      monto total a abonar.
                    </li>
                  </ul>
                  <p className="mt-2">
                    Una vez confirmado el envío, el precio no podrá modificarse
                    salvo acuerdo entre las partes.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">4. Aceptación del envío</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      El envío quedará en estado “Pendiente” hasta que un
                      comisionista lo acepte.
                    </li>
                    <li>
                      El comisionista podrá aceptar o rechazar el envío según
                      disponibilidad.
                    </li>
                    <li>
                      Una vez aceptado, ambas partes se comprometen a cumplir
                      con el servicio acordado.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold">5. Cancelaciones</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      El cliente podrá cancelar el envío mientras se encuentre en
                      estado “Pendiente”.
                    </li>
                    <li>
                      Si el envío ya fue aceptado, podrán aplicarse condiciones
                      según lo acordado entre las partes.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold">6. Responsabilidad</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      El comisionista es responsable por el traslado desde el
                      retiro hasta la entrega.
                    </li>
                    <li>
                      FlexiDrive no se responsabiliza por daños, pérdidas o
                      demoras ocasionadas durante el transporte, actuando
                      únicamente como plataforma de intermediación.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold">7. Calificaciones</h3>
                  <p>
                    Finalizado el servicio, tanto el cliente como el comisionista
                    podrán calificarse mutuamente para garantizar transparencia y
                    confianza dentro de la comunidad.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">8. Protección de datos</h3>
                  <p>
                    Los datos personales proporcionados serán utilizados
                    exclusivamente para la gestión del envío y no serán
                    compartidos con terceros fuera del alcance del servicio.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">9. Aceptación</h3>
                  <p>
                    Al hacer clic en “Confirmar envío”, el usuario acepta
                    expresamente estos términos y condiciones.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-5 py-4">
              <Button variant="outline" onClick={() => setOpenTerms(false)}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  setAccepted(true);
                  setOpenTerms(false);
                }}
              >
                Aceptar términos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayOption({ checked, title, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
        checked
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="font-semibold text-slate-800">{title}</div>
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          checked ? "border-blue-600" : "border-slate-300"
        }`}
      >
        {checked ? <div className="h-3 w-3 rounded-full bg-blue-600" /> : null}
      </div>
    </button>
  );
}