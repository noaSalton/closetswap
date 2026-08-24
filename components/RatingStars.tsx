export function RatingStars({ score, size = "text-base" }: { score: number; size?: string }) {
  const rounded = Math.round(score);
  return (
    <span className={`${size} text-amber-500`} aria-label={`${score} out of 5 stars`}>
      {"★".repeat(rounded)}
      <span className="text-stone-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
