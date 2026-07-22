type JoinScreenProps = {
  playerName: string;
  onPlayerNameChange: (value: string) => void;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  isJoining: boolean;
  onJoin: () => void;
  onCreate: () => void;
};

export default function JoinScreen({
  playerName,
  onPlayerNameChange,
  roomCode,
  onRoomCodeChange,
  isJoining,
  onJoin,
  onCreate,
}: JoinScreenProps) {
  return (
    <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Join or create a room</h2>
        <label className="block text-sm font-medium text-slate-700">
          Your name
          <input
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
            placeholder="Enter your display name"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Room code
          <input
            value={roomCode}
            onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
            placeholder="e.g. MYST"
            maxLength={6}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-wait disabled:opacity-70"
          >
            {isJoining ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Connecting...
              </>
            ) : (
              "Join room"
            )}
          </button>
          <button
            onClick={onCreate}
            disabled={isJoining}
            className="flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 font-medium disabled:cursor-wait disabled:opacity-70"
          >
            {isJoining ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
                Connecting...
              </>
            ) : (
              "Create room"
            )}
          </button>
        </div>
      </div>
      <div className="rounded-3xl bg-slate-950 p-6 text-slate-100">
        <h3 className="text-lg font-semibold">How it works</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li>• Each player sees everyone else's cards, but their own remains hidden.</li>
          <li>• Rank yourself each round and then submit a guess during your turn.</li>
          <li>• Private scratchpad markings stay on your device only.</li>
        </ul>
      </div>
    </section>
  );
}
