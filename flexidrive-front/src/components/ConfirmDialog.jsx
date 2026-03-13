// flexidrive-front/src/components/ConfirmDialog.jsx
import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle } from "lucide-react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  // dialog: { message, labelConfirm, labelCancel, onConfirm, onCancel }

  const confirm = useCallback(
    (message, { labelConfirm = "Aceptar", labelCancel = "Cancelar", onConfirm, onCancel } = {}) => {
      setDialog({ message, labelConfirm, labelCancel, onConfirm, onCancel });
    },
    []
  );

  function handleConfirm() {
    dialog?.onConfirm?.();
    setDialog(null);
  }

  function handleCancel() {
    dialog?.onCancel?.();
    setDialog(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícono + mensaje */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-amber-50">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <p className="text-slate-700 text-base font-medium leading-snug">
                {dialog.message}
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                {dialog.labelCancel}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                {dialog.labelConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx.confirm;
}
