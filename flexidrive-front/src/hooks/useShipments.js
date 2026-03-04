// flexidrive-front/src/hooks/useShipments.js
import { useEffect, useState } from "react";
import {
  cancelarEnvio,
  archivarEnvio,
  eliminarEnvioLogico,
  aceptarEnvio,
  actualizarEstadoEnvio,
} from "../services/shipmentServices";

import { getMyVehicles } from "../services/authService"; // ajustá si tu ruta difiere

const ESTADOS_CANCELABLES = ["PENDIENTE", "ASIGNADO", "EN_RETIRO", "EN_CAMINO", "DEMORADO"];
const ESTADOS_ARCHIVABLES = ["ENTREGADO", "CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"];

export function puedeCancel(estado) {
  return ESTADOS_CANCELABLES.includes((estado || "").toUpperCase());
}
export function puedeArchivar(estado) {
  return ESTADOS_ARCHIVABLES.includes((estado || "").toUpperCase());
}
// ✅ eliminar como finalizados (como querés ahora)
export function puedeEliminar(estado) {
  return ESTADOS_ARCHIVABLES.includes((estado || "").toUpperCase());
}
// ✅ aceptar: solo PENDIENTE
export function puedeAceptar(estado) {
  return (estado || "").toUpperCase() === "PENDIENTE";
}

export function mensajeBloqueo(accion, estado) {
  const e = (estado || "").toUpperCase();

  if (accion === "aceptar") {
    if (e !== "PENDIENTE") return "Solo podés aceptar envíos en estado PENDIENTE.";
  }

  if (accion === "cancelar") {
    if (["ENTREGADO"].includes(e)) return "No se puede cancelar un envío ya entregado.";
    if (["CANCELADO", "CANCELADO_RETORNO", "DEVUELTO"].includes(e)) return "El envío ya fue cancelado.";
  }

  if (accion === "archivar" || accion === "eliminar") {
    return "Solo podés archivar o eliminar envíos finalizados (entregados o cancelados).";
  }

  return "Acción no disponible en el estado actual.";
}

// ✅ decide si X es rechazar/cancelar + estado destino
function resolveEstadoCancelacionComisionista(estadoActual) {
  const e = (estadoActual || "").toUpperCase();

  // No aceptado -> rechazar => queda CANCELADO
  if (e === "PENDIENTE") return { tipo: "rechazar", nuevoEstado: "CANCELADO" };

  // Aceptado pero no salió -> cancelar => CANCELADO
  if (e === "ASIGNADO") return { tipo: "cancelar", nuevoEstado: "CANCELADO" };

  // En tránsito -> cancelación con retorno
  if (["EN_RETIRO", "EN_CAMINO", "DEMORADO"].includes(e)) {
    return { tipo: "cancelar", nuevoEstado: "CANCELADO_RETORNO" };
  }

  return null;
}

/**
 * @param {Object} opts
 * @param {Function} opts.onSuccess
 * @param {"cliente"|"comisionista"} opts.modo
 */
export function useEnvioAcciones({ onSuccess, modo = "cliente" } = {}) {
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState("");
  const [waLink, setWaLink] = useState(null);

  // ✅ aceptar: modal + vehículos
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculoId, setVehiculoId] = useState("");
  const [openAceptar, setOpenAceptar] = useState(false);
  const [aceptarTarget, setAceptarTarget] = useState(null); // { id, estado }

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

        if (!vehiculoId && arr.length === 1) {
          setVehiculoId(arr[0]._id || arr[0].id || "");
        }
      } catch {
        // si falla, no bloquea la pantalla; solo evita aceptar
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  function abrirAceptar(id, estado) {
    if (!puedeAceptar(estado)) {
      setActionError(mensajeBloqueo("aceptar", estado));
      return;
    }
    setActionError("");
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

    if (!vehiculoId) {
      setActionError("Para aceptar un envío tenés que seleccionar un vehículo.");
      return;
    }

    if (!confirm("¿Aceptar este envío?")) return;

    setActionLoading(id + "_aceptar");
    setActionError("");

    try {
      await aceptarEnvio({ envioId: id, vehiculoId });
      cerrarAceptar();
      onSuccess?.();
    } catch (e) {
      setActionError(e?.response?.data?.message || "No se pudo aceptar el envío.");
    } finally {
      setActionLoading(null);
    }
  }

  // ✅ cliente: cancelación “delete”
  async function handleCancelar(id, estado) {
    if (!puedeCancel(estado)) {
      setActionError(mensajeBloqueo("cancelar", estado));
      return;
    }
    if (!confirm("¿Cancelar este envío?")) return;

    setActionLoading(id + "_cancelar");
    setActionError("");

    try {
      const res = await cancelarEnvio(id);
      const data = res?.data ?? res;
      if (data?.waLink) setWaLink(data.waLink);
      onSuccess?.();
    } catch (e) {
      setActionError(e?.response?.data?.message || "No se pudo cancelar.");
    } finally {
      setActionLoading(null);
    }
  }

  // ✅ comisionista: X = rechazar/cancelar según estado (usa actualizarEstadoEnvio)
  async function handleRechazarOCancelarComisionista(id, estadoActual) {
    const r = resolveEstadoCancelacionComisionista(estadoActual);
    if (!r) {
      setActionError(mensajeBloqueo("cancelar", estadoActual));
      return;
    }

    const texto =
      r.tipo === "rechazar"
        ? "¿Rechazar este envío? (quedará cancelado)"
        : "¿Cancelar este envío?";

    if (!confirm(texto)) return;

    setActionLoading(id + "_cancelar");
    setActionError("");

    try {
      await actualizarEstadoEnvio({ envioId: id, nuevoEstado: r.nuevoEstado });
      onSuccess?.();
    } catch (e) {
      setActionError(e?.response?.data?.message || "No se pudo actualizar el estado.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchivar(id, estado) {
    if (!puedeArchivar(estado)) {
      setActionError(mensajeBloqueo("archivar", estado));
      return;
    }

    setActionLoading(id + "_archivar");
    setActionError("");

    try {
      await archivarEnvio(id);
      onSuccess?.();
    } catch (e) {
      setActionError(e?.response?.data?.message || "No se pudo archivar.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEliminar(id, estado) {
    if (!puedeEliminar(estado)) {
      setActionError(mensajeBloqueo("eliminar", estado));
      return;
    }
    if (!confirm("¿Eliminar del historial? No se puede deshacer.")) return;

    setActionLoading(id + "_eliminar");
    setActionError("");

    try {
      await eliminarEnvioLogico(id);
      onSuccess?.();
    } catch (e) {
      setActionError(e?.response?.data?.message || "No se pudo eliminar.");
    } finally {
      setActionLoading(null);
    }
  }

  return {
    actionLoading,
    actionError,
    setActionError,
    waLink,
    setWaLink,

    // ✅ aceptar (modal)
    vehiculos,
    vehiculoId,
    setVehiculoId,
    openAceptar,
    abrirAceptar,
    cerrarAceptar,
    confirmarAceptar,

    // acciones
    handleCancelar, // cliente
    handleRechazarOCancelarComisionista, // comisionista
    handleArchivar,
    handleEliminar,
  };
}