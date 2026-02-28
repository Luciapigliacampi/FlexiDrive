export default function RatingStars({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[1,2,3,4,5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange?.(n)}
          className={`text-3xl ${n <= value ? "text-yellow-500" : "text-slate-300"}`}
          aria-label={`rate-${n}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
