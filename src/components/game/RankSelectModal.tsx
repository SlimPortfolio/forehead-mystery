import Modal from "./Modal";
import { formatRank } from "./types";

type RankSelectModalProps = {
  playerCount: number;
  onSelect: (rank: number) => void;
  onClose: () => void;
};

export default function RankSelectModal({ playerCount, onSelect, onClose }: RankSelectModalProps) {
  const ranks = Array.from({ length: playerCount }, (_, index) => index + 1);

  return (
    <Modal title="Select your rank" onClose={onClose}>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Select the rank you believe you hold relative to every other player.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {ranks.map((rank) => (
          <button
            key={rank}
            onClick={() => onSelect(rank)}
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-left dark:border-slate-600 dark:bg-slate-800"
          >
            <div className="font-semibold text-ink">{formatRank(rank)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {rank - 1} above - {playerCount - rank} Below
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
