import Modal from "./Modal";
import { CARD_POOL, formatRank, Player } from "./types";
import PlayingCard from "./PlayingCard";

type WindowViewModalProps = {
  targetPlayer: Player;
  viewerPlayerId: string;
  players: Player[];
  onClose: () => void;
};

/**
 * Shows the scratchpad as the target player would see it: cards held by
 * anyone other than the viewer or the target are ruled out. Never reflects
 * the target's own manual scratchpad markings — those are private and this
 * viewer has no way to know them, only what's derivable from visible cards.
 */
export default function WindowViewModal({
  targetPlayer,
  viewerPlayerId,
  players,
  onClose,
}: WindowViewModalProps) {
  return (
    <Modal
      title={`Window View for: ${targetPlayer.name}`}
      onClose={onClose}
      headerExtra={
        <div className="flex flex-shrink-0 flex-col items-center gap-1">
          <PlayingCard card={null} size="sm" />
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            Rank
          </span>
          <span className="text-sm font-bold text-slate-900">
            {targetPlayer.ranking ? formatRank(targetPlayer.ranking) : "???"}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {[...CARD_POOL].reverse().map((card) => {
          const isRuledOut = players.some(
            (p) => p.id !== viewerPlayerId && p.id !== targetPlayer.id && p.card === card,
          );

          const className = isRuledOut
            ? "rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-400"
            : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700";

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
