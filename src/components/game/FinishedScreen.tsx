"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getGuessOutcome,
  orderPlayersByTurn,
  Room,
  suitForGame,
  US_STATES,
} from "./types";
import PlayingCard from "./PlayingCard";
import CityAutocomplete from "./CityAutocomplete";
import { getCitiesForState } from "@/data/usCities";
import { getCitiesForCountry, getCountries } from "@/data/worldCities";

const INTERNATIONAL = "INTL";

/** Chip shown next to the sole player who guessed wrong. */
function JesterChip() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
      Jester!
      <span aria-hidden>🃏</span>
    </span>
  );
}

type WinnerForm = {
  teamName: string;
  date: string;
  time: string;
  city: string;
  state: string;
  country: string;
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
  const [cityValid, setCityValid] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const isInternational = winnerForm.state === INTERNATIONAL;
  const suit = suitForGame(room.gameNumber);
  const orderedPlayers = orderPlayersByTurn(room);

  // Load the country list the first time the host switches to International.
  useEffect(() => {
    if (!isInternational || countries.length > 0) return;
    let active = true;
    getCountries().then((list) => {
      if (active) setCountries(list);
    });
    return () => {
      active = false;
    };
  }, [isInternational, countries.length]);

  // The jester label only appears when exactly one player guessed wrong.
  const incorrectPlayers = orderedPlayers.filter(
    (player) => getGuessOutcome(player)?.tone === "error",
  );
  const jesterId =
    incorrectPlayers.length === 1 ? incorrectPlayers[0].id : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <h3 className="text-lg font-semibold">Game complete</h3>
      <div className="mt-3 space-y-2">
        {orderedPlayers.map((player) => {
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
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-ink">{player.name}</p>
                  {player.id === jesterId && <JesterChip />}
                </div>
                {outcome && (
                  <p
                    className={`text-sm ${
                      outcome.tone === "success"
                        ? "text-emerald-700"
                        : "text-rose-700"
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
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-semibold text-ink">
            Perfect game! Everyone identified their card.
          </h4>
          {!isHost ? (
            <p className="mt-2 text-sm text-slate-600">
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
                    onWinnerFormChange({
                      ...winnerForm,
                      teamName: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
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
                  {isInternational ? "Region" : "State"}
                  <select
                    value={winnerForm.state}
                    onChange={(event) =>
                      onWinnerFormChange({
                        ...winnerForm,
                        state: event.target.value,
                        // Reset dependent fields so a stale value can't linger.
                        country: "",
                        city: "",
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value={INTERNATIONAL}>International</option>
                    <optgroup label="United States">
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                {isInternational && (
                  <label className="block text-sm font-medium text-slate-700">
                    Country
                    <select
                      value={winnerForm.country}
                      onChange={(event) =>
                        onWinnerFormChange({
                          ...winnerForm,
                          country: event.target.value,
                          // Clear the city so a value from another country can't linger.
                          city: "",
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block text-sm font-medium text-slate-700">
                  City
                  <CityAutocomplete
                    regionKey={
                      isInternational ? winnerForm.country : winnerForm.state
                    }
                    getCities={
                      isInternational ? getCitiesForCountry : getCitiesForState
                    }
                    value={winnerForm.city}
                    onChange={(city) =>
                      onWinnerFormChange({ ...winnerForm, city })
                    }
                    onValidityChange={setCityValid}
                    placeholder={
                      isInternational ? "e.g. Toronto" : "e.g. Austin"
                    }
                    disabledHint={
                      isInternational
                        ? "Select a country first"
                        : "Select a state first"
                    }
                  />
                </label>
              </div>
              {winnerForm.city.trim() &&
                !cityValid &&
                (isInternational ? winnerForm.country : winnerForm.state) && (
                  <p className="text-xs text-rose-600">
                    Pick a city from the list to match{" "}
                    {isInternational ? winnerForm.country : winnerForm.state}.
                  </p>
                )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cards
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {room.players.map((player) => (
                    <span
                      key={player.id}
                      className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
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
                  !winnerForm.state ||
                  !cityValid
                }
                className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
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
            className="rounded-2xl bg-ink px-4 py-2 font-semibold text-white"
          >
            Next game
          </button>
        )}
      </div>
    </div>
  );
}
