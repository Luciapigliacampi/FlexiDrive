// src/utils/priceUtils.js

export function calcularTotalConDescuento({
  precioPorBulto,
  bultos,
  descuento,
}) {
  const base = precioPorBulto * bultos;

  if (!descuento) {
    return { base, final: base, descuentoAplicado: 0 };
  }

  const min = Number(descuento.minBultos ?? 0);
  const tipo = descuento.tipo;
  const valor = Number(descuento.valor ?? 0);

  if (!min || bultos < min || !valor || valor <= 0) {
    return { base, final: base, descuentoAplicado: 0 };
  }

  let descuentoAplicado = 0;

  if (tipo === "porcentaje") {
    descuentoAplicado = base * (valor / 100);
  } else if (tipo === "monto") {
    descuentoAplicado = valor * bultos;
  }

  const final = Math.max(0, base - descuentoAplicado);

  return {
    base,
    final,
    descuentoAplicado,
  };
}