// src/components/RatingStars.jsx
export default function RatingStars({ value, onChange, readonly = false }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => !readonly && onChange?.(n)}
          disabled={readonly}
          className={`text-2xl transition-transform ${
            n <= value ? "text-yellow-500" : "text-slate-300"
          } ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
          aria-label={`rate-${n}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}