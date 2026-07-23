type PlayingCardProps = {
  card?: string | null;
  suit?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

const SIZE_CLASSES: Record<NonNullable<PlayingCardProps["size"]>, string> = {
  xs: "h-10 w-7 text-base",
  sm: "h-12 w-9 text-xl",
  md: "h-16 w-12 text-2xl",
  lg: "h-20 w-14 text-3xl",
};

/**
 * Placeholder card face — no card art asset yet, so rank + a suit pip
 * stand in for full suit art until a real deck asset/library is chosen.
 * Suit is passed in by the caller (one suit per game, not per card).
 */
export default function PlayingCard({ card, suit = "♦", size = "md" }: PlayingCardProps) {
  const isHidden = !card;
  const display = card ?? "?";
  const isRed = suit === "♦" || suit === "♥";

  return (
    <div
      className={`flex flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-sm ${SIZE_CLASSES[size]}`}
    >
      <span
        className={`font-bold leading-none ${
          isHidden ? "text-slate-400" : isRed ? "text-rose-600" : "text-ink"
        }`}
      >
        {display}
      </span>
      <span
        className={`leading-none ${
          isHidden ? "text-slate-300" : isRed ? "text-rose-600" : "text-ink"
        }`}
      >
        {isHidden ? "" : suit}
      </span>
    </div>
  );
}
