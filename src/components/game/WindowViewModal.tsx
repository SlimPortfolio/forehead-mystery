import Modal from "./Modal";
import { CARD_POOL, formatRank, Player } from "./types";
import PlayingCard from "./PlayingCard";

type WindowViewModalProps = {
  targetPlayer: Player;
  viewerPlayerId: string;
  players: Player[];
  suit: string;
  onClose: () => void;
};

/**
 * Shows the scratchpad as the target player would see it: cards held by
 * anyone other than the viewer or the target are ruled out. Never reflects
 * the target's own manual scratchpad markings — those are private and this
 * viewer has no way to know them, only what's derivable from visible cards.
 * The target's card is shown plainly in the header since the viewer can
 * already see it in the main player list; only the derived list below
 * excludes it (the target wouldn't know their own card).
 */
export default function WindowViewModal({
  targetPlayer,
  viewerPlayerId,
  players,
  suit,
  onClose,
}: WindowViewModalProps) {
  return (
    <Modal
      title={`Window View for: ${targetPlayer.name}`}
      onClose={onClose}
      subheader={
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <PlayingCard card={targetPlayer.card ?? null} suit={suit} size="sm" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Rank
              </span>
              <span className="text-sm font-bold text-ink">
                {targetPlayer.ranking ? formatRank(targetPlayer.ranking) : "???"}
              </span>
              {targetPlayer.ranking && (
                <span className="text-xs text-slate-500">
                  {targetPlayer.ranking - 1} above - {players.length - targetPlayer.ranking} below
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-500">
            This view shows what {targetPlayer.name} sees, not including your card.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-1">
        {[...CARD_POOL].reverse().map((card) => {
          const isRuledOut = players.some(
            (p) => p.id !== viewerPlayerId && p.id !== targetPlayer.id && p.card === card,
          );

          const className = isRuledOut
            ? "rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-left text-xs font-medium text-slate-400"
            : "rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-left text-xs font-medium text-slate-700";

          return (
            <div key={card} className={className}>
              {card} - {isRuledOut ? "That's not possible" : "Possible"}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
