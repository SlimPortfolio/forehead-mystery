import { Room } from "./types";

type LobbyScreenProps = {
  room: Room;
  isHost: boolean;
  onStartGame: () => void;
  onStartWithTestPlayers: () => void;
  onStartAnyway: () => void;
};

export default function LobbyScreen({
  room,
  isHost,
  onStartGame,
  onStartWithTestPlayers,
  onStartAnyway,
}: LobbyScreenProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Lobby</p>
          <h2 className="text-xl font-semibold">{room.id}</h2>
        </div>
        {isHost && (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={onStartGame}
              className="rounded-2xl bg-amber-500 px-4 py-2 font-semibold text-white"
            >
              Start game
            </button>
            <button
              onClick={onStartWithTestPlayers}
              className="rounded-2xl bg-slate-600 px-4 py-2 font-semibold text-white"
            >
              Start with test players
            </button>
            <button
              onClick={onStartAnyway}
              className="rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-600"
            >
              Start anyway (2+ players)
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {room.players.map((player) => (
          <div key={player.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{player.name}</p>
                <p className="text-xs text-slate-500">{player.isHost ? "Host" : "Player"}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                {player.isReady ? "Ready" : "Connecting"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-600">
        The host can begin the game once there are 4-8 players in the room.
      </p>
    </div>
  );
}
