// flexidrive-front/src/services/tripPlanMappers.js

const DIA_TO_NUM = {
  Dom: 0,
  Lun: 1,
  Mar: 2,
  "Mié": 3,
  Mie: 3,
  Jue: 4,
  Vie: 5,
  "Sáb": 6,
  Sab: 6,
};

const NUM_TO_DIA = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

// ─── UI → API ─────────────────────────────────────────────────────────────────
// Convierte el payload que arma RutaModal al formato que espera viajes-service.
// Campos clave:
//   UI:      dias (string[]),  activa (bool), precioPorBulto (string)
//   Backend: diasSemana (int[]), activo (bool), precio (number)

export function rutaToTripPlanPayload(rutaUI) {
  const diasSemana = (rutaUI?.dias || [])
    .map((d) => DIA_TO_NUM[d])
    .filter((n) => Number.isInteger(n));

  const intermediasOk = (rutaUI?.intermedias || []).filter(
    (x) => x?.provinciaId && x?.localidadId
  );

  const preciosPorLocalidad = (rutaUI?.preciosPorLocalidad || [])
    .filter((x) => x?.localidadId)
    .map((x) => ({
      localidadId: String(x.localidadId),
      localidadNombre: String(x.localidadNombre || ""),
      precio: Number(x.precioPorBulto),  // UI usa precioPorBulto → backend usa precio
    }))
    .filter((x) => Number.isFinite(x.precio) && x.precio > 0);

  return {
    vehiculoId: String(rutaUI?.vehiculoId || ""),
    origen: rutaUI?.origen,
    destino: rutaUI?.destino,
    intermedias: intermediasOk,
    diasSemana,                    // backend espera diasSemana, no dias
    activo: !!rutaUI?.activa,      // backend espera activo, no activa
    preciosPorLocalidad,
    descuentoPorBultos: {
      minBultos: Number(rutaUI?.descuentoPorBultos?.minBultos) || 0,
      tipo: rutaUI?.descuentoPorBultos?.tipo || "porcentaje",
      valor: Number(rutaUI?.descuentoPorBultos?.valor) || 0,
    },
  };
}

// ─── API → UI ─────────────────────────────────────────────────────────────────
// Convierte lo que devuelve viajes-service (TripPlan) al formato que usa la UI.
// Campos clave:
//   Backend: _id,         diasSemana (int[]), activo (bool), precio (number)
//   UI:      id + _id,    dias (string[]),    activa (bool), precioPorBulto (string)

export function tripPlanToRutaUI(tp) {
  return {
    // FIX: exponemos tanto id como _id para que getRutaId() funcione
    // sin importar qué campo usa el código que consume esto
    id:  tp?._id ? String(tp._id) : (tp?.id ? String(tp.id) : ""),
    _id: tp?._id ? String(tp._id) : (tp?.id ? String(tp.id) : ""),

    vehiculoId: String(tp?.vehiculoId || ""),

    origen: {
      provinciaId:    String(tp?.origen?.provinciaId    || ""),
      provinciaNombre: tp?.origen?.provinciaNombre      || "",
      localidadId:    String(tp?.origen?.localidadId    || ""),
      localidadNombre: tp?.origen?.localidadNombre      || "",
    },
    destino: {
      provinciaId:    String(tp?.destino?.provinciaId   || ""),
      provinciaNombre: tp?.destino?.provinciaNombre     || "",
      localidadId:    String(tp?.destino?.localidadId   || ""),
      localidadNombre: tp?.destino?.localidadNombre     || "",
    },
    intermedias: (tp?.intermedias || []).map((x) => ({
      provinciaId:    String(x?.provinciaId    || ""),
      provinciaNombre: x?.provinciaNombre      || "",
      localidadId:    String(x?.localidadId    || ""),
      localidadNombre: x?.localidadNombre      || "",
    })),

    // FIX: diasSemana (int[]) → dias (string[])
    dias: (tp?.diasSemana || []).map((n) => NUM_TO_DIA[n]).filter(Boolean),

    // FIX: activo (backend) → activa (UI)
    activa: tp?.activo ?? true,

    // FIX: precio (backend) → precioPorBulto (UI string)
    preciosPorLocalidad: (tp?.preciosPorLocalidad || []).map((x) => ({
      localidadId:    String(x.localidadId    || ""),
      localidadNombre: x.localidadNombre      || "",
      precioPorBulto: String(x.precio         ?? ""),  // precio → precioPorBulto
    })),

    descuentoPorBultos: tp?.descuentoPorBultos || { minBultos: 0, tipo: "porcentaje", valor: 0 },
  };
}
