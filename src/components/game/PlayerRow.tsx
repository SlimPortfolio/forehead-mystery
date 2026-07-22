import { formatRank, GamePhase, getGuessOutcome, Player } from "./types";
import PlayingCard from "./PlayingCard";

type PlayerRowProps = {
  player: Player;
  isSelf: boolean;
  isCurrentTurn: boolean;
  hasActedThisPhase: boolean;
  phase: GamePhase;
  suit: string;
  onOpenWindowView: (playerId: string) => void;
};

function getStatus(player: Player, isCurrentTurn: boolean, phase: GamePhase) {
  // Confirmation phase means the current player already acted — show their
  // result instead of a stale "it's your move" banner for that same row.
  if (phase === "confirmation") return getGuessOutcome(player);

  if (isCurrentTurn) return { text: "It's your move sucker!", tone: "turn" as const };

  if (phase === "guessing") return getGuessOutcome(player);

  return null;
}

export default function PlayerRow({
  player,
  isSelf,
  isCurrentTurn,
  hasActedThisPhase,
  phase,
  suit,
  onOpenWindowView,
}: PlayerRowProps) {
  const status = getStatus(player, isCurrentTurn, phase);

  let borderClass = "border-slate-200 bg-white";
  if (isCurrentTurn) {
    borderClass = "border-amber-400 bg-amber-50";
  } else if (status?.tone === "success") {
    borderClass = "border-emerald-300 bg-emerald-50";
  } else if (status?.tone === "error") {
    borderClass = "border-rose-300 bg-rose-50";
  } else if (hasActedThisPhase) {
    borderClass = "border-emerald-400 bg-white";
  }

  const displayCard = isSelf ? null : (player.card ?? null);
  const rankLabel = player.ranking ? formatRank(player.ranking) : "???";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${borderClass}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold text-slate-900">{player.name}</p>
          {!isSelf && (
            <button
              onClick={() => onOpenWindowView(player.id)}
              aria-label={`View ${player.name}'s window`}
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-500"
            >
              i
            </button>
          )}
        </div>
        {status && (
          <p
            className={`mt-0.5 text-sm ${
              status.tone === "turn"
                ? "text-amber-700"
                : status.tone === "success"
                  ? "text-emerald-700"
                  : "text-rose-700"
            }`}
          >
            {status.text}
          </p>
        )}
      </div>

      <PlayingCard card={displayCard} suit={suit} size="sm" />

      <div className="flex flex-shrink-0 flex-col items-center gap-1">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          Rank
        </span>
        <span className="text-lg font-bold text-slate-900">{rankLabel}</span>
      </div>
    </div>
  );
}
