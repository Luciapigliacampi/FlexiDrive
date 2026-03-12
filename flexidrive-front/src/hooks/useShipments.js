// flexidrive-front/src/hooks/useShipments.js
import { useEffect, useState } from "react";
import {
  cancelarEnvio,
  archivarEnvio,
  eliminarEnvioLogico,
  aceptarEnvio,
  marcarRetirado,
  marcarEntregado,
  cancelarPorComisionista,
} from "../services/shipmentServices";
import { getMyVehicles } from "../services/authService";
import { getTodayString } from "../utils/testDate";
import { useToast } from "../components/toast/useToast";

function getTodayISO() {
  return getTodayString();
}

const TRANSICIONES = {
  // DEMORADO_RETIRO: nunca fue retirado → se puede retirar o cancelar sin retorno
  // DEMORADO_ENTREGA: ya fue retirado → se puede entregar o cancelar con retorno
  CANCELAR_SIN_RETORNO: ["ASIGNADO", "EN_RETIRO", "DEMORADO_RETIRO"],
  CANCELAR_CON_RETORNO: ["RETIRADO", "EN_CAMINO", "DEMORADO_ENTREGA"],
  CANCELAR_CLIENTE:     ["PENDIENTE", "ASIGNADO", "EN_RETIRO", "RETIRADO", "EN_CAMINO", "DEMORADO_RETIRO", "DEMORADO_ENTREGA"],
  PUEDE_RETIRAR:        ["ASIGNADO", "EN_RETIRO", "DEMORADO_RETIRO"],
  PUEDE_ENTREGAR:       ["RETIRADO", "EN_CAMINO", "DEMORADO_ENTREGA"],
  PUEDE_ACEPTAR:        ["PENDIENTE"],
  PUEDE_ARCHIVAR:       ["ENTREGADO", "CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"],
  PUEDE_ELIMINAR:       ["ENTREGADO", "CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"],
};

export function puedeAceptar(estado)  { return TRANSICIONES.PUEDE_ACEPTAR.includes((estado || "").toUpperCase()); }
export function puedeCancel(estado)   { return TRANSICIONES.CANCELAR_CLIENTE.includes((estado || "").toUpperCase()); }
export function puedeArchivar(estado) { return TRANSICIONES.PUEDE_ARCHIVAR.includes((estado || "").toUpperCase()); }
export function puedeEliminar(estado) { return TRANSICIONES.PUEDE_ELIMINAR.includes((estado || "").toUpperCase()); }
export function puedeRetirar(estado)  { return TRANSICIONES.PUEDE_RETIRAR.includes((estado || "").toUpperCase()); }
export function puedeEntregar(estado) { return TRANSICIONES.PUEDE_ENTREGAR.includes((estado || "").toUpperCase()); }

export function mensajeBloqueo(accion, estado) {
  const e = (estado || "").toUpperCase();
  if (accion === "aceptar")  return e !== "PENDIENTE" ? "Solo podés aceptar envíos pendientes." : "";
  if (accion === "retirar")  return !TRANSICIONES.PUEDE_RETIRAR.includes(e)  ? `No se puede retirar en estado ${e}.`  : "";
  if (accion === "entregar") return !TRANSICIONES.PUEDE_ENTREGAR.includes(e) ? `No se puede entregar en estado ${e}.` : "";
  if (accion === "cancelar") {
    if (["ENTREGADO", "DEVUELTO"].includes(e))            return "El envío ya finalizó.";
    if (["CANCELADO", "CANCELADO_RETORNO"].includes(e))   return "El envío ya fue cancelado.";
  }
  if (accion === "archivar" || accion === "eliminar") return "Solo podés archivar/eliminar envíos finalizados.";
  return "Acción no disponible.";
}

export function useEnvioAcciones({ onSuccess, modo = "cliente" } = {}) {
  const { toast } = useToast();

  const [actionLoading, setActionLoading] = useState(null);
  const [actionError,   setActionError]   = useState("");
  const [waLink,        setWaLink]        = useState(null);

  const [vehiculos,    setVehiculos]    = useState([]);
  const [vehiculoId,   setVehiculoId]   = useState("");
  const [fechaRetiro,  setFechaRetiro]  = useState(getTodayISO());
  const [franjaRetiro, setFranjaRetiro] = useState("08:00-13:00");
  const [openAceptar,  setOpenAceptar]  = useState(false);
  const [aceptarTarget, setAceptarTarget] = useState(null);

  useEffect(() => {
    if (modo !== "comisionista") return;
    let alive = true;
    (async () => {
      try {
        const res = await getMyVehicles();
        const data = res?.data ?? res;
        const arr = Array.isArray(data) ? data : Array.isArray(data?.vehiculos) ? data.vehiculos : [];
        if (!alive) return;
        setVehiculos(arr);
        if (!vehiculoId && arr.length === 1) setVehiculoId(arr[0]._id || arr[0].id || "");
      } catch {}
    })();
    return () => { alive = false; };
  }, [modo]);

  function abrirAceptar(id, estado) {
    if (!puedeAceptar(estado)) {
      const msg = mensajeBloqueo("aceptar", estado);
      setActionError(msg);
      toast.warning(msg);
      return;
    }
    setActionError("");
    setFechaRetiro(getTodayISO());
    setFranjaRetiro("08:00-13:00");
    setAceptarTarget({ id, estado });
    setOpenAceptar(true);
  }

  function cerrarAceptar() {
    setOpenAceptar(false);
    setAceptarTarget(null);
  }

  async function confirmarAceptar() {
    const id = aceptarTarget?.id;
    if (!id) return;
    if (!vehiculoId) { const m = "Seleccioná un vehículo."; setActionError(m); toast.warning(m); return; }
    if (!fechaRetiro) { const m = "Indicá la fecha de retiro."; setActionError(m); toast.warning(m); return; }
    if (!franjaRetiro) { const m = "Indicá la franja horaria."; setActionError(m); toast.warning(m); return; }

    setActionLoading(id + "_aceptar");
    setActionError("");
    try {
      await aceptarEnvio({ envioId: id, vehiculoId, fecha_retiro: fechaRetiro, franja_horaria_retiro: franjaRetiro });
      toast.success("Envío aceptado correctamente.");
      cerrarAceptar();
      onSuccess?.();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo aceptar el envío.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRetirar(id, estado) {
    if (!puedeRetirar(estado)) {
      const msg = mensajeBloqueo("retirar", estado);
      setActionError(msg);
      toast.warning(msg);
      return;
    }
    setActionLoading(id + "_retirar");
    setActionError("");
    try {
      await marcarRetirado(id);
      toast.success("Envío marcado como retirado.");
      onSuccess?.();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo marcar como retirado.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  }

  function handleEntregar(id, estado) {
    if (!puedeEntregar(estado)) {
      const msg = mensajeBloqueo("entregar", estado);
      setActionError(msg);
      toast.warning(msg);
      return;
    }
    toast.confirm("¿Confirmar entrega?", {
      label: "Entregar",
      onConfirm: async () => {
        setActionLoading(id + "_entregar");
        setActionError("");
        try {
          await marcarEntregado(id);
          toast.success("Envío marcado como entregado.");
          onSuccess?.();
        } catch (e) {
          const msg = e?.response?.data?.message || "No se pudo marcar como entregado.";
          setActionError(msg);
          toast.error(msg);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  function handleCancelar(id, estado) {
    if (!puedeCancel(estado)) {
      const msg = mensajeBloqueo("cancelar", estado);
      setActionError(msg);
      toast.warning(msg);
      return;
    }
    toast.confirm("¿Cancelar este envío?", {
      label: "Cancelar",
      onConfirm: async () => {
        setActionLoading(id + "_cancelar");
        setActionError("");
        try {
          const res = await cancelarEnvio(id);
          const data = res?.data ?? res;
          if (data?.waLink) setWaLink(data.waLink);
          toast.success("Envío cancelado correctamente.");
          onSuccess?.();
        } catch (e) {
          const msg = e?.response?.data?.message || "No se pudo cancelar.";
          setActionError(msg);
          toast.error(msg);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  function handleRechazarOCancelarComisionista(id, estadoActual) {
    const e = (estadoActual || "").toUpperCase();
    const esCancelable = [
      ...TRANSICIONES.CANCELAR_SIN_RETORNO,
      ...TRANSICIONES.CANCELAR_CON_RETORNO,
      "PENDIENTE",
    ].includes(e);

    if (!esCancelable) {
      const msg = mensajeBloqueo("cancelar", estadoActual);
      setActionError(msg);
      toast.warning(msg);
      return;
    }

    const esRetorno = TRANSICIONES.CANCELAR_CON_RETORNO.includes(e);
    const texto =
      e === "PENDIENTE"          ? "¿Rechazar este envío?"
      : esRetorno                ? "¿Cancelar? El paquete ya fue retirado y se marcará como en devolución."
      :                            "¿Cancelar este envío?";

    toast.confirm(texto, {
      label: e === "PENDIENTE" ? "Rechazar" : "Cancelar",
      onConfirm: async () => {
        setActionLoading(id + "_cancelar");
        setActionError("");
        try {
          const res = await cancelarPorComisionista(id);
          const data = res?.data ?? res;
          if (data?.waLink) setWaLink(data.waLink);
          toast.success("Operación realizada correctamente.");
          onSuccess?.();
        } catch (err) {
          const msg = err?.response?.data?.message || "No se pudo cancelar.";
          setActionError(msg);
          toast.error(msg);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  async function handleArchivar(id, estado) {
    if (!puedeArchivar(estado)) {
      const msg = mensajeBloqueo("archivar", estado);
      setActionError(msg);
      toast.warning(msg);
      return;
    }
    setActionLoading(id + "_archivar");
    setActionError("");
    try {
      await archivarEnvio(id);
      toast.success("Envío archivado correctamente.");
      onSuccess?.();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo archivar.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  }

  function handleEliminar(id, estado) {
    if (!puedeEliminar(estado)) {
      const msg = mensajeBloqueo("eliminar", estado);
      setActionError(msg);
      toast.warning(msg);
      return;
    }
    toast.confirm("¿Eliminar del historial? No se puede deshacer.", {
      label: "Eliminar",
      onConfirm: async () => {
        setActionLoading(id + "_eliminar");
        setActionError("");
        try {
          await eliminarEnvioLogico(id);
          toast.success("Envío eliminado del historial.");
          onSuccess?.();
        } catch (e) {
          const msg = e?.response?.data?.message || "No se pudo eliminar.";
          setActionError(msg);
          toast.error(msg);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  return {
    actionLoading, actionError, setActionError,
    waLink, setWaLink,
    vehiculos, vehiculoId, setVehiculoId,
    fechaRetiro, setFechaRetiro,
    franjaRetiro, setFranjaRetiro,
    openAceptar, abrirAceptar, cerrarAceptar, confirmarAceptar,
    handleCancelar, handleRechazarOCancelarComisionista,
    handleRetirar, handleEntregar,
    handleArchivar, handleEliminar,
  };
}
