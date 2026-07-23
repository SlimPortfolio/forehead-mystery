import { formatRank, GamePhase, getGuessOutcome, Player } from "./types";
import PlayingCard from "./PlayingCard";
import ChatBubble from "./ChatBubble";

type PlayerRowProps = {
  player: Player;
  isSelf: boolean;
  isCurrentTurn: boolean;
  hasActedThisPhase: boolean;
  phase: GamePhase;
  suit: string;
  chatText?: string;
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
  chatText,
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

  // Your own card stays hidden until you've made your one guess this game —
  // right or wrong, there's no more suspense left to protect after that.
  const hasGuessed = getGuessOutcome(player) !== null;
  const displayCard = isSelf && !hasGuessed ? null : (player.card ?? null);
  const rankLabel = player.ranking ? formatRank(player.ranking) : "???";

  return (
    <div className={`relative flex items-center justify-between gap-2.5 rounded-2xl border px-3 py-2 ${borderClass}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold leading-tight text-slate-900">{player.name}</p>
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
            className={`mt-0.5 text-xs leading-tight ${
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

      <div className="relative flex-shrink-0">
        {chatText && <ChatBubble text={chatText} />}
        <PlayingCard card={displayCard} suit={suit} size="xs" />
      </div>

      <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
          Rank
        </span>
        <span className="text-base font-bold leading-none text-slate-900">{rankLabel}</span>
      </div>
    </div>
  );
}
