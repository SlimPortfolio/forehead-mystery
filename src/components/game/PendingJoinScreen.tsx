import { Room } from "./types";

type PendingJoinScreenProps = {
  room: Room;
  onLeave: () => void;
};

/** Shown to a player who joined a room while a game was already underway.
 * They sit this game out and get dealt in automatically once the host
 * starts the next one. */
export default function PendingJoinScreen({ room, onLeave }: PendingJoinScreenProps) {
  const activePlayers = room.players.filter((player) => !player.pendingJoin);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
        Room {room.id}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-ink">
        A game is already in progress
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        You&apos;ll be dealt in as soon as this game wraps up and the host
        starts the next one. Hang tight!
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Currently playing
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {activePlayers.map((player) => (
            <div
              key={player.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <p className="font-semibold text-ink">{player.name}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onLeave}
        className="mt-4 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        Leave room
      </button>
    </div>
  );
}
