import Link from "next/link";
import { getGuessOutcome, Room, suitForGame, US_STATES } from "./types";
import PlayingCard from "./PlayingCard";

type WinnerForm = {
  teamName: string;
  date: string;
  time: string;
  city: string;
  state: string;
};

type FinishedScreenProps = {
  room: Room;
  isHost: boolean;
  allCorrectlyIdentified: boolean;
  winnerForm: WinnerForm;
  onWinnerFormChange: (form: WinnerForm) => void;
  winnerSaveStatus: "idle" | "saving" | "saved" | "error";
  onSubmitWinner: () => void;
  onStartNextGame: () => void;
  onReviewScratchpad: () => void;
};

export default function FinishedScreen({
  room,
  isHost,
  allCorrectlyIdentified,
  winnerForm,
  onWinnerFormChange,
  winnerSaveStatus,
  onSubmitWinner,
  onStartNextGame,
  onReviewScratchpad,
}: FinishedScreenProps) {
  const suit = suitForGame(room.gameNumber);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <h3 className="text-lg font-semibold">Game complete</h3>
      <div className="mt-3 space-y-2">
        {room.players.map((player) => {
          const outcome = getGuessOutcome(player);
          const borderClass =
            outcome?.tone === "success"
              ? "border-emerald-300 bg-emerald-50"
              : outcome?.tone === "error"
                ? "border-rose-300 bg-rose-50"
                : "border-slate-200 bg-slate-50";

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${borderClass}`}
            >
              <div>
                <p className="font-semibold text-slate-900">{player.name}</p>
                {outcome && (
                  <p
                    className={`text-sm ${
                      outcome.tone === "success" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {outcome.text}
                  </p>
                )}
              </div>
              <PlayingCard card={player.card ?? null} suit={suit} size="sm" />
            </div>
          );
        })}
      </div>

      {allCorrectlyIdentified && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="font-semibold text-amber-900">
            Perfect game! Everyone identified their card.
          </h4>
          {!isHost ? (
            <p className="mt-2 text-sm text-amber-800">
              Ask your host to save this victory to the{" "}
              <Link href="/winners" className="underline">
                winners page
              </Link>
              .
            </p>
          ) : winnerSaveStatus === "saved" ? (
            <p className="mt-2 text-sm text-emerald-700">
              Saved! View it on the{" "}
              <Link href="/winners" className="underline">
                winners page
              </Link>
              .
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Team name
                <input
                  value={winnerForm.teamName}
                  onChange={(event) =>
                    onWinnerFormChange({ ...winnerForm, teamName: event.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. The Card Sharks"
                />
              </label>
              <p className="text-xs text-slate-500">
                {winnerForm.date && winnerForm.time
                  ? `Recorded at ${winnerForm.date} ${winnerForm.time}`
                  : "Recording current date and time."}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  City
                  <input
                    value={winnerForm.city}
                    onChange={(event) =>
                      onWinnerFormChange({ ...winnerForm, city: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. Austin"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  State
                  <select
                    value={winnerForm.state}
                    onChange={(event) =>
                      onWinnerFormChange({ ...winnerForm, state: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cards
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {room.players.map((player) => (
                    <span
                      key={player.id}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                    >
                      {player.name}: {player.card}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={onSubmitWinner}
                disabled={
                  winnerSaveStatus === "saving" ||
                  !winnerForm.teamName.trim() ||
                  !winnerForm.city.trim() ||
                  !winnerForm.state
                }
                className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {winnerSaveStatus === "saving" ? "Saving..." : "Save victory"}
              </button>
              {winnerSaveStatus === "error" && (
                <p className="text-sm text-rose-600">
                  Something went wrong saving this. Please try again.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onReviewScratchpad}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
        >
          Review Scratchpad
        </button>
        {isHost && (
          <button
            onClick={onStartNextGame}
            className="rounded-2xl bg-amber-500 px-4 py-2 font-semibold text-white"
          >
            Next game
          </button>
        )}
      </div>
    </div>
  );
}
