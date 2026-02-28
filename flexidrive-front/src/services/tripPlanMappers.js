//flexidrive-front\src\services\tripPlanMappers.js
export function rutaToTripPlanPayload(rutaUI) {
  return {
    origenCiudad: rutaUI.origen?.localidadNombre,
    destinoCiudad: rutaUI.destino?.localidadNombre,
    paradas: Array.isArray(rutaUI.intermedias)
      ? rutaUI.intermedias
          .filter((x) => x?.localidadNombre)
          .map((x) => x.localidadNombre)
      : [],
    diasSemana: diasToDiasSemana(rutaUI.dias || []),
    activo: !!rutaUI.activa,
    preciosPorLocalidad: Array.isArray(rutaUI.preciosPorLocalidad)
      ? rutaUI.preciosPorLocalidad
          .filter((x) => x?.localidadNombre)
          .map((x) => ({
            localidad: x.localidadNombre,
            precio: Number(x.precioPorBulto),
          }))
      : [],
  };
}

// API -> UI
export function tripPlanToRutaUI(tripPlan) {
  return {
    id: String(tripPlan._id),
    origen: {
      provinciaId: "",
      provinciaNombre: "",
      localidadId: "",
      localidadNombre: tripPlan.origenCiudad || "",
    },
    destino: {
      provinciaId: "",
      provinciaNombre: "",
      localidadId: "",
      localidadNombre: tripPlan.destinoCiudad || "",
    },
    intermedias: Array.isArray(tripPlan.paradas)
      ? tripPlan.paradas.map((name) => ({
          provinciaId: "",
          provinciaNombre: "",
          localidadId: "",
          localidadNombre: name,
        }))
      : [],
    dias: diasSemanaToDias(tripPlan.diasSemana || []),
    activa: tripPlan.activo ?? true,
    preciosPorLocalidad: Array.isArray(tripPlan.preciosPorLocalidad)
      ? tripPlan.preciosPorLocalidad.map((p) => ({
          localidadNombre: p.localidad,
          precioPorBulto: p.precio,
        }))
      : [],
  };
}

// --- Helpers días ---
const MAP_DIA_TO_NUM = { Dom: 0, Lun: 1, Mar: 2, Mié: 3, Jue: 4, Vie: 5, Sáb: 6 };
const MAP_NUM_TO_DIA = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };

export function diasToDiasSemana(dias) {
  return (dias || [])
    .map((d) => MAP_DIA_TO_NUM[d])
    .filter((n) => Number.isInteger(n));
}

export function diasSemanaToDias(nums) {
  return (nums || [])
    .map((n) => MAP_NUM_TO_DIA[n])
    .filter(Boolean);
}