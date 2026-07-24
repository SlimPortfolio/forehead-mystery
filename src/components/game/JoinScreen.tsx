type JoinScreenProps = {
  playerName: string;
  onPlayerNameChange: (value: string) => void;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  isJoining: boolean;
  onJoin: () => void;
  onCreate: () => void;
  onShowHelp: () => void;
};

export default function JoinScreen({
  playerName,
  onPlayerNameChange,
  roomCode,
  onRoomCodeChange,
  isJoining,
  onJoin,
  onCreate,
  onShowHelp,
}: JoinScreenProps) {
  return (
    <section className="flex flex-1 min-h-0 flex-col gap-5 overflow-y-auto border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Forehead Mystery logo"
          className="h-20 w-20 object-cover"
        />
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Forehead Mystery
        </h1>
        <p className="max-w-md text-sm text-slate-500">
          A game of teamwork and logic that makes time pass faster and makes
          long lines disappear.
        </p>
        <button
          type="button"
          onClick={onShowHelp}
          className="mt-2 text-xs font-semibold tracking-wide text-ink uppercase underline underline-offset-4 hover:text-ink/70"
        >
          How to Play
        </button>
      </div>

      <div className="space-y-4 pt-6">
        <h2 className="text-xl font-semibold">Join or create a room</h2>
        <label className="block text-sm font-medium text-slate-700">
          Your name
          <input
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
            placeholder="Enter your display name"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Room code
          <input
            value={roomCode}
            onChange={(event) =>
              onRoomCodeChange(event.target.value.toUpperCase())
            }
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
            placeholder="e.g. PORK"
            maxLength={6}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="flex items-center gap-2 rounded-2xl bg-ink px-4 py-2 font-medium text-white disabled:cursor-wait disabled:opacity-70"
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
            className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 font-medium disabled:cursor-wait disabled:opacity-70"
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
    </section>
  );
}
