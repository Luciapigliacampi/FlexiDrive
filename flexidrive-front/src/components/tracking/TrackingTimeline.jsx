import { ESTADOS_ENVIO, ESTADO_FALLBACK } from "../../config/estadosEnvio";
import { toEstadoKey } from "../../utils/estadoUtils";

const EXCLUDE = new Set(["archivado"]); // no lo mostramos en tracking

const buildSteps = () =>
  Object.values(ESTADOS_ENVIO)
    .filter((s) => !EXCLUDE.has(s.key))
    .sort((a, b) => a.order - b.order);

export default function TrackingTimeline({ estadoRaw }) {
  const estadoKey = toEstadoKey(estadoRaw);
  const actual = ESTADOS_ENVIO[estadoKey] || null;
  const actualOrder = actual?.order ?? 0;

  const steps = buildSteps();

  const isCancelled =
    estadoKey === "cancelado" || estadoKey === "cancelado_retorno";

  // si está cancelado, mostramos hasta el estado cancelado (y cortamos)
  const visibleSteps = isCancelled
    ? (() => {
        const idx = steps.findIndex((s) => s.key === estadoKey);
        return idx >= 0 ? steps.slice(0, idx + 1) : steps;
      })()
    : steps;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Seguimiento</h3>
        <p className="text-xs text-slate-500">
          Estado actual:{" "}
          <span className="font-semibold text-slate-700">
            {actual?.label || ESTADO_FALLBACK.label}
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {visibleSteps.map((step, idx) => {
          const isDone = step.order < actualOrder;
          const isActive = step.order === actualOrder;
          const DotIcon = step.Icon;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Dot + línea */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border",
                    isActive
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : isDone
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-white text-slate-400",
                  ].join(" ")}
                >
                  {DotIcon ? <DotIcon className="h-4 w-4" /> : null}
                </div>

                {idx !== visibleSteps.length - 1 && (
                  <div
                    className={[
                      "mt-1 w-px flex-1",
                      isDone || isActive ? "bg-slate-300" : "bg-slate-200",
                    ].join(" ")}
                    style={{ minHeight: 18 }}
                  />
                )}
              </div>

              {/* Texto */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "text-sm font-semibold",
                      isActive
                        ? "text-slate-900"
                        : isDone
                        ? "text-slate-700"
                        : "text-slate-500",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>

                  {isActive && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      Ahora
                    </span>
                  )}

                  {isDone && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Completado
                    </span>
                  )}
                </div>

                {isCancelled && step.key === estadoKey && (
                  <p className="mt-1 text-xs text-red-600">
                    El envío fue cancelado.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}