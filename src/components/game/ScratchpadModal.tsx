import Modal from "./Modal";
import { CARD_POOL, CardState, Player } from "./types";

type ScratchpadModalProps = {
  scratchpad: Record<string, CardState>;
  myPlayerId: string;
  players: Player[];
  onToggle: (card: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export default function ScratchpadModal({
  scratchpad,
  myPlayerId,
  players,
  onToggle,
  onClear,
  onClose,
}: ScratchpadModalProps) {
  return (
    <Modal title="Private Scratchpad" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {[...CARD_POOL].reverse().map((card) => {
          const isHeldByOther = players
            .filter((p) => p.id !== myPlayerId)
            .some((p) => p.card === card);
          const state: CardState = isHeldByOther ? "impossible" : (scratchpad[card] ?? "possible");
          const displayState =
            state === "most-likely"
              ? "Most likely"
              : state === "impossible"
                ? isHeldByOther
                  ? "That's not possible"
                  : "Impossible"
                : "Possible";

          let className = "rounded-xl border px-3 py-2 text-left text-sm font-medium";
          if (isHeldByOther) {
            className += " border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed";
          } else if (state === "most-likely") {
            className += " border-amber-400 bg-amber-100 text-amber-800";
          } else if (state === "impossible") {
            className += " border-rose-300 bg-rose-50 text-rose-700";
          } else {
            className += " border-slate-300 bg-white text-slate-700";
          }

          return (
            <button
              key={card}
              onClick={() => onToggle(card)}
              disabled={isHeldByOther}
              className={className}
            >
              {card} - {displayState}
            </button>
          );
        })}
      </div>
      <button
        onClick={onClear}
        className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-2.5 font-medium text-slate-600"
      >
        Clear
      </button>
    </Modal>
  );
}
