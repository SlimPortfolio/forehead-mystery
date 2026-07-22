import Link from "next/link";
import { Room } from "./types";

type WinnerForm = {
  teamName: string;
  date: string;
  time: string;
  location: string;
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
}: FinishedScreenProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <h3 className="text-lg font-semibold">Game complete</h3>
      <div className="mt-3 space-y-2">
        {room.players.map((player) => (
          <div key={player.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span>{player.name}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-sm font-medium text-emerald-700">
                {player.card}
              </span>
            </div>
          </div>
        ))}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Date
                  <input
                    type="date"
                    value={winnerForm.date}
                    onChange={(event) =>
                      onWinnerFormChange({ ...winnerForm, date: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Time
                  <input
                    type="time"
                    value={winnerForm.time}
                    onChange={(event) =>
                      onWinnerFormChange({ ...winnerForm, time: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Location
                <input
                  value={winnerForm.location}
                  onChange={(event) =>
                    onWinnerFormChange({ ...winnerForm, location: event.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Sarah's living room"
                />
              </label>
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
                disabled={winnerSaveStatus === "saving"}
                className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
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

      {isHost && (
        <button
          onClick={onStartNextGame}
          className="mt-4 rounded-2xl bg-amber-500 px-4 py-2 font-semibold text-white"
        >
          Next game
        </button>
      )}
    </div>
  );
}
