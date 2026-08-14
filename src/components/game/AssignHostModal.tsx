import Modal from "./Modal";
import { isBotPlayer, Player } from "./types";

type AssignHostModalProps = {
  players: Player[];
  currentHostId: string;
  onAssign: (playerId: string) => void;
  onClose: () => void;
};

/** Lets the host hand off the room before leaving. Bots can't take over
 * (they only ever act on their own turn) and departed players are already
 * gone, so both are excluded from the candidate list. */
export default function AssignHostModal({
  players,
  currentHostId,
  onAssign,
  onClose,
}: AssignHostModalProps) {
  const eligible = players.filter(
    (player) =>
      player.id !== currentHostId &&
      !player.departed &&
      !isBotPlayer(player),
  );

  return (
    <Modal title="Choose a new host" onClose={onClose}>
      {eligible.length === 0 ? (
        <p className="text-sm text-slate-600">
          No other players available to take over as host.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Pick who takes over as host when you leave.
          </p>
          {eligible.map((player) => (
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
                onClick={() => onAssign(player.id)}
                className="rounded-xl bg-ink px-3 py-1.5 text-sm font-semibold text-white"
              >
                Make host
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
