"use client";

import { useState } from "react";
import { Room } from "./types";

type LobbyScreenProps = {
  room: Room;
  status: string;
  isHost: boolean;
  onStartGame: () => void;
  onStartWithBots: (totalPlayers: number) => void;
};

const MAX_PLAYERS = 8;
const MIN_PLAYERS = 4;

export default function LobbyScreen({
  room,
  status,
  isHost,
  onStartGame,
  onStartWithBots,
}: LobbyScreenProps) {
  const [botsOpen, setBotsOpen] = useState(false);

  const humanCount = room.players.length;
  const minTotal = Math.max(MIN_PLAYERS, humanCount);
  const botOptions =
    humanCount >= MAX_PLAYERS
      ? []
      : Array.from(
          { length: MAX_PLAYERS - minTotal + 1 },
          (_, i) => minTotal + i,
        );

  const handleSelectBots = (totalPlayers: number) => {
    setBotsOpen(false);
    onStartWithBots(totalPlayers);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      {status && (
        <p className="mb-3 text-xs font-medium text-ink/70">{status}</p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Lobby
          </p>
          <h2 className="text-xl font-semibold">{room.id}</h2>
        </div>

        {isHost && (
          <div className="flex flex-nowrap items-start justify-end gap-2">
            <button
              onClick={onStartGame}
              className="whitespace-nowrap rounded-2xl bg-ink px-2.5 py-1.5 text-sm font-semibold text-white"
            >
              Start game
            </button>

            <div className="relative">
              <button
                onClick={() => setBotsOpen((open) => !open)}
                disabled={botOptions.length === 0}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-2xl border border-slate-300 px-2.5 py-1.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start with bots
                <span
                  className={`text-xs transition-transform ${botsOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
              {botsOpen && botOptions.length > 0 && (
                <>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setBotsOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg">
                    <p className="px-3 py-1.5 text-xs text-slate-500">
                      Fill seats with bots
                    </p>
                    {botOptions.map((total) => {
                      const bots = total - humanCount;
                      return (
                        <button
                          key={total}
                          onClick={() => handleSelectBots(total)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-ink hover:bg-slate-100"
                        >
                          <span>{total} players</span>
                          <span className="text-xs text-slate-500">
                            {humanCount}{" "}
                            {humanCount === 1 ? "player" : "players"} + {bots}{" "}
                            {bots === 1 ? "bot" : "bots"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {room.players.map((player) => (
          <div
            key={player.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{player.name}</p>
                <p className="text-xs text-slate-500">
                  {player.isHost ? "Host" : "Player"}
                </p>
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
