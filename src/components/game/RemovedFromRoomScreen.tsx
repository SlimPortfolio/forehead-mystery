type RemovedFromRoomScreenProps = {
  onReturnHome: () => void;
};

/** Shown when a poll picks up that the host has kicked this player. */
export default function RemovedFromRoomScreen({
  onReturnHome,
}: RemovedFromRoomScreenProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <h2 className="text-xl font-semibold text-ink">
        You were removed from this room
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        The host removed you from the room. You can head back and join a
        different room if you&apos;d like.
      </p>
      <button
        onClick={onReturnHome}
        className="mt-4 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
      >
        Return to home
      </button>
    </div>
  );
}
