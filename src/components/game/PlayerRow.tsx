import { Clock, Telescope } from "lucide-react";
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
  /** Host-synced special deck art (Room.bokSpecial). */
  special?: boolean;
  chatText?: string;
  /** True while this player's card is still face-down during the start-of-game
   * deal-in reveal. */
  faceDown?: boolean;
  /** Seconds this player (always the current-turn player, if set) has gone
   * without any detected activity. Null/undefined hides the "gone AFK?"
   * indicator. */
  awaySeconds?: number | null;
  onOpenLookingGlass: (playerId: string) => void;
};

function formatAwayDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

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
  special,
  chatText,
  faceDown = false,
  awaySeconds,
  onOpenLookingGlass,
}: PlayerRowProps) {
  // A player who joined mid-game sits out the current game. Show them as a
  // muted, non-interactive spectator row — no Looking Glass, rank, status, or
  // card — so it's clear they're present but not part of this game yet.
  if (player.pendingJoin) {
    return (
      <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 opacity-60 dark:border-slate-700 dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight text-slate-500 dark:text-slate-400">
            {player.name}
          </p>
          <p className="mt-0.5 text-xs leading-tight text-slate-400 dark:text-slate-500">
            Will join next game
          </p>
        </div>
        <div className="relative flex-shrink-0">
          {chatText && <ChatBubble text={chatText} />}
          <PlayingCard card={null} suit={suit} size="xs" special={special} />
        </div>
      </div>
    );
  }

  const status = getStatus(player, isCurrentTurn, phase);

  let borderClass = "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800";
  if (isCurrentTurn) {
    // The pulse animation drives the border/background colors itself, so the
    // static amber classes are left off this row to avoid fighting it.
    borderClass = "animate-turn-pulse";
  } else if (status?.tone === "success") {
    borderClass = "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950";
  } else if (status?.tone === "error") {
    borderClass = "border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950";
  } else if (hasActedThisPhase) {
    borderClass = "border-emerald-400 bg-white dark:border-emerald-700 dark:bg-slate-800";
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
          <p className="truncate font-semibold leading-tight text-ink">{player.name}</p>
          {typeof awaySeconds === "number" && (
            <span
              title={`No activity for ${formatAwayDuration(awaySeconds)}`}
              className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            >
              <Clock className="h-3 w-3" strokeWidth={2.5} />
              {formatAwayDuration(awaySeconds)}
            </span>
          )}
          {!isSelf && (
            <button
              onClick={() => onOpenLookingGlass(player.id)}
              aria-label={`Open ${player.name}'s Looking Glass`}
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
            >
              <Telescope className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
        {status && (
          <p
            className={`mt-0.5 text-xs leading-tight ${
              status.tone === "turn"
                ? "text-amber-700 dark:text-amber-300"
                : status.tone === "success"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-700 dark:text-rose-300"
            }`}
          >
            {status.text}
          </p>
        )}
      </div>

      <div className="relative flex-shrink-0">
        {chatText && <ChatBubble text={chatText} />}
        <PlayingCard card={displayCard} suit={suit} size="xs" faceDown={faceDown} special={special} />
      </div>

      <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Rank
        </span>
        <span className="text-base font-bold leading-none text-ink">{rankLabel}</span>
      </div>
    </div>
  );
}
