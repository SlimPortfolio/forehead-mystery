import Modal from "./Modal";
import { CARD_POOL, CardState, formatRank, Player } from "./types";

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
    <Modal
      title="Private Scratchpad"
      onClose={onClose}
      headerAction={
        <button
          onClick={onClear}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600"
        >
          Clear
        </button>
      }
    >
      <div className="flex flex-col gap-1.5">
        {[...CARD_POOL].reverse().map((card) => {
          const owner = players.find(
            (p) => p.id !== myPlayerId && p.card === card,
          );
          const isHeldByOther = Boolean(owner);
          const ownerHasGuessed = owner?.ranking != null;
          const state: CardState = isHeldByOther
            ? "impossible"
            : (scratchpad[card] ?? "possible");
          const displayState =
            state === "most-likely"
              ? "Most likely"
              : state === "impossible"
                ? isHeldByOther
                  ? "That's not possible"
                  : "Impossible"
                : "Possible";

          let className =
            "rounded-lg border px-2.5 py-1 text-left text-xs font-medium";
          if (isHeldByOther) {
            className +=
              " border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed";
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
              {owner ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400">
                    {card} - That&apos;s not possible
                  </span>
                  {ownerHasGuessed && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-ink font-medium">
                        {owner.name} guessed
                      </span>
                      <span className="rounded-full bg-pink-300 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                        {formatRank(owner.ranking as number)}
                      </span>
                    </>
                  )}
                </span>
              ) : (
                `${card} - ${displayState}`
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
