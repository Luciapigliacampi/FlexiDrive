import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);
let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const toastFn = useCallback(
    (message, { type = "info", duration = 3500, action = null } = {}) => {
      const id = ++toastIdCounter;

      setToasts((prev) => [
        ...prev,
        { id, message, type, action, leaving: false },
      ]);

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss]
  );

  const toast = useMemo(() => {
    const baseToast = (msg, opts) => toastFn(msg, opts);

    return {
      show: baseToast,
      success: (msg, opts) => toastFn(msg, { type: "success", ...opts }),
      error: (msg, opts) =>
        toastFn(msg, { type: "error", duration: 5000, ...opts }),
      warning: (msg, opts) => toastFn(msg, { type: "warning", ...opts }),
      info: (msg, opts) => toastFn(msg, { type: "info", ...opts }),
      confirm: (msg, { label = "Confirmar", onConfirm, duration = 8000 } = {}) =>
        toastFn(msg, {
          type: "warning",
          duration,
          action: {
            label,
            onClick: onConfirm,
          },
        }),
    };
  }, [toastFn]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

const STYLES = {
  success: {
    Icon: CheckCircle,
    bar: "bg-emerald-500",
    icon_cls: "text-emerald-500",
  },
  error: {
    Icon: XCircle,
    bar: "bg-red-500",
    icon_cls: "text-red-500",
  },
  warning: {
    Icon: AlertTriangle,
    bar: "bg-amber-400",
    icon_cls: "text-amber-500",
  },
  info: {
    Icon: Info,
    bar: "bg-blue-500",
    icon_cls: "text-blue-500",
  },
};

function ToastItem({ toast, dismiss }) {
  const { Icon, bar, icon_cls } = STYLES[toast.type] ?? STYLES.info;

  return (
    <div
      style={{
        animation: toast.leaving
          ? "toast-out 0.25s ease forwards"
          : "toast-in 0.25s ease forwards",
      }}
      className="relative flex items-start gap-3 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden px-4 py-3"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon_cls}`} />

      <div className="flex-1 text-sm text-slate-700 leading-snug pr-2 space-y-2">
        <p>{toast.message}</p>

        {toast.action && (
          <button
            onClick={() => {
              toast.action.onClick?.();
              dismiss(toast.id);
            }}
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => dismiss(toast.id)}
        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(100%); }
        }
      `}</style>

      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} dismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
}