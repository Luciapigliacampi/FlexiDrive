import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import heroImg from "../../assets/hero.svg";

export default function Totp() {
  const LENGTH = 6;
  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const [touched, setTouched] = useState(false);

  const inputsRef = useRef([]);

  const code = useMemo(() => digits.join(""), [digits]);
  const isComplete = code.length === LENGTH && digits.every((d) => d !== "");

  // Enfocar el primer input al cargar
  useEffect(() => {
    inputsRef.current?.[0]?.focus?.();
  }, []);

  const setAt = (idx, value) => {
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const focusIndex = (idx) => {
    const el = inputsRef.current?.[idx];
    if (el) el.focus();
  };

  const handleChange = (idx, raw) => {
    setTouched(true);

    // Permitir pegar todo junto en un input
    const onlyNums = (raw || "").replace(/\D/g, "");
    if (!onlyNums) {
      setAt(idx, "");
      return;
    }

    // Si pega 6 dígitos (o más), distribuimos
    if (onlyNums.length > 1) {
      const chunk = onlyNums.slice(0, LENGTH).split("");
      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < LENGTH; i++) next[i] = chunk[i] || "";
        return next;
      });

      // foco al último lleno
      const last = Math.min(chunk.length, LENGTH) - 1;
      focusIndex(last >= 0 ? last : 0);
      return;
    }

    // Un solo dígito
    setAt(idx, onlyNums);
    if (idx < LENGTH - 1) focusIndex(idx + 1);
  };

  const handleKeyDown = (idx, e) => {
    const key = e.key;

    // Backspace: si está vacío, volver al anterior
    if (key === "Backspace") {
      setTouched(true);

      if (digits[idx]) {
        setAt(idx, "");
        return;
      }
      if (idx > 0) {
        focusIndex(idx - 1);
        setAt(idx - 1, "");
      }
      return;
    }

    // Flechas
    if (key === "ArrowLeft") {
      if (idx > 0) focusIndex(idx - 1);
      return;
    }
    if (key === "ArrowRight") {
      if (idx < LENGTH - 1) focusIndex(idx + 1);
      return;
    }

    // Evitar letras
    if (key.length === 1 && /\D/.test(key)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    setTouched(true);
    const text = e.clipboardData.getData("text");
    const onlyNums = (text || "").replace(/\D/g, "").slice(0, LENGTH);
    if (!onlyNums) return;

    e.preventDefault();
    const chunk = onlyNums.split("");
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < LENGTH; i++) next[i] = chunk[i] || "";
      return next;
    });
    focusIndex(Math.min(chunk.length, LENGTH) - 1);
  };

  const onVerify = (e) => {
    e.preventDefault();
    setTouched(true);

    if (!isComplete) return;

    // ✅ Acá después conectamos con tu backend:
    // verifyTotp(code)
    console.log("TOTP code:", code);
  };

  return (
    <main className="bg-slate-80">
      <section className="bg-slate-100">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-center">
        
            {/* DERECHA - CARD */}
            <div className="lg:col-span-3">
              <form
                onSubmit={onVerify}
                className="bg-slate-100/80 border border-slate-300 rounded-2xl p-7 w-full max-w-sm ml-auto"
              >
                <div className="text-slate-800 font-semibold text-lg">
                  Ingresá tu código
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Te pedimos esto para confirmar tu identidad.
                </div>

                <label className="block text-base text-slate-700 mt-6 mb-3">
                  Código TOTP
                </label>

                {/* Inputs 6 dígitos */}
                <div
                  className="flex items-center justify-between gap-2"
                  onPaste={handlePaste}
                >
                  {digits.map((value, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputsRef.current[idx] = el)}
                      value={value}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      className={[
                        "w-12 h-12 sm:w-12 sm:h-12",
                        "text-center text-lg font-semibold",
                        "rounded-xl border bg-white outline-none",
                        "focus:ring-2 focus:ring-blue-200",
                        value
                          ? "border-slate-300"
                          : touched
                          ? "border-slate-300"
                          : "border-slate-200",
                      ].join(" ")}
                      aria-label={`Dígito ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Mensajito helper */}
                <div className="mt-3 text-xs text-slate-600">
                  Tip: podés pegar el código completo (ej: 123456).
                </div>

                <button
                  type="submit"
                  disabled={!isComplete}
                  className={[
                    "mt-5 w-full inline-flex items-center justify-center rounded-full py-3.5 font-medium shadow-sm transition",
                    isComplete
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "bg-slate-300 text-slate-600 cursor-not-allowed",
                  ].join(" ")}
                >
                  Verificar
                </button>

                <div className="mt-4 text-center text-sm text-slate-700">
                  ¿No era tu cuenta?{" "}
                  <Link
                    to="/auth/login"
                    className="text-blue-700 font-medium hover:underline"
                  >
                    Cambiar usuario
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
