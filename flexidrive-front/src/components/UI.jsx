//flexidrive-front\src\components\UI.jsx
export function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border bg-white p-6 ${className}`}>
      {title ? <div className="text-xl font-bold text-slate-700">{title}</div> : null}
      <div className={title ? "mt-4 space-y-3" : ""}>{children}</div>
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border px-4 py-3 outline-none text-slate-700 ${className}`}
    />
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const base = "rounded-full px-8 py-3 font-semibold disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-blue-700 text-white hover:bg-blue-800"
      : variant === "outline"
      ? "border text-slate-700 hover:bg-slate-50"
      : "bg-slate-100 text-slate-800 hover:bg-slate-200";

  return <button {...props} className={`${base} ${styles} ${className}`} />;
}
