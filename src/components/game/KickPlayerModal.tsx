import Modal from "./Modal";
import { Player } from "./types";

type KickPlayerModalProps = {
  players: Player[];
  hostId: string;
  onKick: (playerId: string) => void;
  onClose: () => void;
};

export default function KickPlayerModal({
  players,
  hostId,
  onKick,
  onClose,
}: KickPlayerModalProps) {
  const kickable = players.filter((player) => player.id !== hostId);

  return (
    <Modal title="Remove a player" onClose={onClose}>
      {kickable.length === 0 ? (
        <p className="text-sm text-slate-600">No other players in the room.</p>
      ) : (
        <div className="space-y-2">
          {kickable.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="font-semibold text-ink">{player.name}</p>
                {player.pendingJoin && (
                  <p className="text-xs text-slate-500">
                    Waiting for next game
                  </p>
                )}
              </div>
              <button
                onClick={() => onKick(player.id)}
                className="rounded-xl bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
