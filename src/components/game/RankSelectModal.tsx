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
      <p className="text-sm text-slate-600">
        Select the rank you believe you hold relative to every other player.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {ranks.map((rank) => (
          <button
            key={rank}
            onClick={() => onSelect(rank)}
            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-left"
          >
            <div className="font-semibold text-slate-900">{formatRank(rank)}</div>
            <div className="text-xs text-slate-500">
              {rank - 1} above - {playerCount - rank} Below
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
