// flexidrive-front/src/hooks/useShipments.js
import { useEffect, useState } from "react";
import {
  cancelarEnvio,
  archivarEnvio,
  eliminarEnvioLogico,
  aceptarEnvio,
  marcarRetirado,
  marcarEntregado,
} from "../services/shipmentServices";
import { getMyVehicles } from "../services/authService";
import { getTodayString } from "../utils/testDate";
import { cancelarPorComisionista } from "../services/shipmentServices"

/* ─── helpers de estadogetTodayISO

─────────────────────────────────────────────────── */
function getTodayISO() {
  return getTodayString();
}

// Máquina de estados — transiciones permitidas por rol
const TRANSICIONES = {
  CANCELAR_SIN_RETORNO:  ["ASIGNADO", "EN_RETIRO"],
  CANCELAR_CON_RETORNO:  ["RETIRADO", "EN_CAMINO", "DEMORADO"],
  CANCELAR_CLIENTE:      ["PENDIENTE", "ASIGNADO", "EN_RETIRO", "RETIRADO", "EN_CAMINO", "DEMORADO"],
  PUEDE_RETIRAR:         ["ASIGNADO", "EN_RETIRO"],
  PUEDE_ENTREGAR:        ["RETIRADO", "EN_CAMINO", "DEMORADO"],
  PUEDE_ACEPTAR:         ["PENDIENTE"],
  PUEDE_ARCHIVAR:        ["ENTREGADO", "CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"],
  PUEDE_ELIMINAR:        ["ENTREGADO", "CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"],
};

export function puedeAceptar(estado)  { return TRANSICIONES.PUEDE_ACEPTAR.includes((estado||"").toUpperCase()); }
export function puedeCancel(estado)   { return TRANSICIONES.CANCELAR_CLIENTE.includes((estado||"").toUpperCase()); }
export function puedeArchivar(estado) { return TRANSICIONES.PUEDE_ARCHIVAR.includes((estado||"").toUpperCase()); }
export function puedeEliminar(estado) { return TRANSICIONES.PUEDE_ELIMINAR.includes((estado||"").toUpperCase()); }
export function puedeRetirar(estado)  { return TRANSICIONES.PUEDE_RETIRAR.includes((estado||"").toUpperCase()); }
export function puedeEntregar(estado) { return TRANSICIONES.PUEDE_ENTREGAR.includes((estado||"").toUpperCase()); }

export function mensajeBloqueo(accion, estado) {
  const e = (estado || "").toUpperCase();
  if (accion === "aceptar")  return e !== "PENDIENTE" ? "Solo podés aceptar envíos pendientes." : "";
  if (accion === "retirar")  return !TRANSICIONES.PUEDE_RETIRAR.includes(e)  ? `No se puede retirar en estado ${e}.`  : "";
  if (accion === "entregar") return !TRANSICIONES.PUEDE_ENTREGAR.includes(e) ? `No se puede entregar en estado ${e}.` : "";
  if (accion === "cancelar") {
    if (["ENTREGADO", "DEVUELTO"].includes(e)) return "El envío ya finalizó.";
    if (["CANCELADO", "CANCELADO_RETORNO"].includes(e)) return "El envío ya fue cancelado.";
  }
  if (accion === "archivar" || accion === "eliminar") return "Solo podés archivar/eliminar envíos finalizados.";
  return "Acción no disponible.";
}

/* ─── hook principal ────────────────────────────────────────────────────── */
export function useEnvioAcciones({ onSuccess, modo = "cliente" } = {}) {
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError,   setActionError]   = useState("");
  const [waLink,        setWaLink]        = useState(null);

  // Modal aceptar
  const [vehiculos,     setVehiculos]     = useState([]);
  const [vehiculoId,    setVehiculoId]    = useState("");
  const [fechaRetiro,   setFechaRetiro]   = useState(getTodayISO());
  const [franjaRetiro,  setFranjaRetiro]  = useState("08:00-13:00");
  const [openAceptar,   setOpenAceptar]   = useState(false);
  const [aceptarTarget, setAceptarTarget] = useState(null);

  useEffect(() => {
    if (modo !== "comisionista") return;
    let alive = true;
    (async () => {
      try {
        const res  = await getMyVehicles();
        const data = res?.data ?? res;
        const arr  = Array.isArray(data) ? data : Array.isArray(data?.vehiculos) ? data.vehiculos : [];
        if (!alive) return;
        setVehiculos(arr);
        if (!vehiculoId && arr.length === 1) setVehiculoId(arr[0]._id || arr[0].id || "");
      } catch { /* no bloquea */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  /* ── modal aceptar ────────────────────────────────────────────────────── */
  function abrirAceptar(id, estado) {
    if (!puedeAceptar(estado)) { setActionError(mensajeBloqueo("aceptar", estado)); return; }
    setActionError("");
    setFechaRetiro(getTodayISO());
    setFranjaRetiro("08:00-13:00");
    setAceptarTarget({ id, estado });
    setOpenAceptar(true);
  }
  function cerrarAceptar() { setOpenAceptar(false); setAceptarTarget(null); }

  async function confirmarAceptar() {
    const id = aceptarTarget?.id;
    if (!id) return;
    if (!vehiculoId)   { setActionError("Seleccioná un vehículo."); return; }
    if (!fechaRetiro)  { setActionError("Indicá la fecha de retiro."); return; }
    if (!franjaRetiro) { setActionError("Indicá la franja horaria."); return; }

    setActionLoading(id + "_aceptar");
    setActionError("");
    try {
      await aceptarEnvio({ envioId: id, vehiculoId, fecha_retiro: fechaRetiro, franja_horaria_retiro: franjaRetiro });
      cerrarAceptar();
      onSuccess?.();
    } catch (e) {
      setActionError(e?.response?.data?.message || "No se pudo aceptar el envío.");
    } finally {
      setActionLoading(null);
    }
  }

  /* ── acciones directas ────────────────────────────────────────────────── */
  async function handleRetirar(id, estado) {
    if (!puedeRetirar(estado)) { setActionError(mensajeBloqueo("retirar", estado)); return; }
    setActionLoading(id + "_retirar"); setActionError("");
    try { await marcarRetirado(id); onSuccess?.(); }
    catch (e) { setActionError(e?.response?.data?.message || "No se pudo marcar como retirado."); }
    finally { setActionLoading(null); }
  }

  async function handleEntregar(id, estado) {
    if (!puedeEntregar(estado)) { setActionError(mensajeBloqueo("entregar", estado)); return; }
    if (!confirm("¿Confirmar entrega?")) return;
    setActionLoading(id + "_entregar"); setActionError("");
    try { await marcarEntregado(id); onSuccess?.(); }
    catch (e) { setActionError(e?.response?.data?.message || "No se pudo marcar como entregado."); }
    finally { setActionLoading(null); }
  }

  // Cliente cancela
  async function handleCancelar(id, estado) {
    if (!puedeCancel(estado)) { setActionError(mensajeBloqueo("cancelar", estado)); return; }
    if (!confirm("¿Cancelar este envío?")) return;
    setActionLoading(id + "_cancelar"); setActionError("");
    try {
      const res  = await cancelarEnvio(id);
      const data = res?.data ?? res;
      if (data?.waLink) setWaLink(data.waLink);
      onSuccess?.();
    } catch (e) { setActionError(e?.response?.data?.message || "No se pudo cancelar."); }
    finally { setActionLoading(null); }
  }

  // Comisionista cancela/rechaza
  async function handleRechazarOCancelarComisionista(id, estadoActual) {
    const e = (estadoActual || "").toUpperCase();
    const esCancelable = [...TRANSICIONES.CANCELAR_SIN_RETORNO, ...TRANSICIONES.CANCELAR_CON_RETORNO, "PENDIENTE"].includes(e);
    if (!esCancelable) { setActionError(mensajeBloqueo("cancelar", estadoActual)); return; }

    const esRetorno = TRANSICIONES.CANCELAR_CON_RETORNO.includes(e);
    const texto = e === "PENDIENTE" ? "¿Rechazar este envío?"
                : esRetorno ? "¿Cancelar? El paquete ya fue retirado — se marcará como en devolución."
                : "¿Cancelar este envío?";
    if (!confirm(texto)) return;

    setActionLoading(id + "_cancelar"); setActionError("");
    try {
      // Usar el endpoint de cancelar por comisionista
      const res = await cancelarPorComisionista(id); // el backend detecta el rol
      const data = res?.data ?? res;
      if (data?.waLink) setWaLink(data.waLink);
      onSuccess?.();
    } catch (e) { setActionError(e?.response?.data?.message || "No se pudo cancelar."); }
    finally { setActionLoading(null); }
  }

  async function handleArchivar(id, estado) {
    if (!puedeArchivar(estado)) { setActionError(mensajeBloqueo("archivar", estado)); return; }
    setActionLoading(id + "_archivar"); setActionError("");
    try { await archivarEnvio(id); onSuccess?.(); }
    catch (e) { setActionError(e?.response?.data?.message || "No se pudo archivar."); }
    finally { setActionLoading(null); }
  }

  async function handleEliminar(id, estado) {
    if (!puedeEliminar(estado)) { setActionError(mensajeBloqueo("eliminar", estado)); return; }
    if (!confirm("¿Eliminar del historial? No se puede deshacer.")) return;
    setActionLoading(id + "_eliminar"); setActionError("");
    try { await eliminarEnvioLogico(id); onSuccess?.(); }
    catch (e) { setActionError(e?.response?.data?.message || "No se pudo eliminar."); }
    finally { setActionLoading(null); }
  }

  return {
    actionLoading, actionError, setActionError, waLink, setWaLink,
    vehiculos, vehiculoId, setVehiculoId,
    fechaRetiro, setFechaRetiro,
    franjaRetiro, setFranjaRetiro,
    openAceptar, abrirAceptar, cerrarAceptar, confirmarAceptar,
    handleCancelar,
    handleRechazarOCancelarComisionista,
    handleRetirar,
    handleEntregar,
    handleArchivar,
    handleEliminar,
  };
}
