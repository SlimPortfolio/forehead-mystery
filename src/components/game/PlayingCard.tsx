type PlayingCardProps = {
  card?: string | null;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES: Record<NonNullable<PlayingCardProps["size"]>, string> = {
  sm: "h-12 w-9 text-xl",
  md: "h-16 w-12 text-2xl",
  lg: "h-20 w-14 text-3xl",
};

/**
 * Placeholder card face — no card art asset yet, so rank + a diamond pip
 * stand in for full suit art until a real deck asset/library is chosen.
 */
export default function PlayingCard({ card, size = "md" }: PlayingCardProps) {
  const isHidden = !card;
  const display = card ?? "?";

  return (
    <div
      className={`flex flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-sm ${SIZE_CLASSES[size]}`}
    >
      <span className={`font-bold leading-none ${isHidden ? "text-slate-400" : "text-rose-600"}`}>
        {display}
      </span>
      <span className={`leading-none ${isHidden ? "text-slate-300" : "text-rose-600"}`}>
        {isHidden ? "" : "♦"}
      </span>
    </div>
  );
}
