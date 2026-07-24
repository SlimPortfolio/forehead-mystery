"use client";

import { useState } from "react";
import PlayingCard from "./PlayingCard";
import type { WinnerRecord } from "@/lib/winners";

type WinnerPopupCardProps = {
  winners: WinnerRecord[];
};

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RANK_ABBREVIATIONS: Record<string, string> = {
  ace: "A",
  king: "K",
  queen: "Q",
  jack: "J",
};

function parseCard(card: string): { rank: string; suit: string } {
  const [rankWord, suitWord] = card.split(" of ").map((part) => part.trim());
  const rank = RANK_ABBREVIATIONS[rankWord?.toLowerCase() ?? ""] ?? rankWord ?? "?";
  const suit = SUIT_SYMBOLS[suitWord?.toLowerCase() ?? ""] ?? "♦";
  return { rank, suit };
}

// The stored date/time are naive strings entered by the submitter. This popup
// only ever renders client-side, so we format them in the viewer's locale for
// a proper date + 12-hour clock; fall back to the raw strings if unparseable.
function formatWhen(date: string, time: string): { day: string; clock: string } {
  const parsed = new Date(`${date}T${time}`);
  if (Number.isNaN(parsed.getTime())) {
    return { day: date, clock: time };
  }
  return {
    day: parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    clock: parsed.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export default function WinnerPopupCard({ winners }: WinnerPopupCardProps) {
  const [index, setIndex] = useState(0);
  const winner = winners[index];
  const when = formatWhen(winner.date, winner.time);

  return (
    <div className="w-60">
      {/* Team name — the marquee of the card, with an accent rule beneath */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-xl font-bold leading-tight text-ink">
          {winner.teamName}
        </h3>
        {winners.length > 1 && (
          <span className="mt-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {index + 1} / {winners.length}
          </span>
        )}
      </div>
      <div className="mt-1 h-0.5 w-10 rounded-full bg-rose-500" />

      {/* Date & time of victory, prefixed with a clock glyph */}
      <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-700">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>
          {when.day} at <span className="font-semibold text-ink">{when.clock}</span>
        </span>
      </div>

      {/* Location, prefixed with a map-pin glyph */}
      <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="#e11d48"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <path d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9Zm0 12.5A3.5 3.5 0 1 1 12 5.5a3.5 3.5 0 0 1 0 7Z" />
        </svg>
        <span>{winner.location}</span>
      </div>

      {/* Winning hand — cards evenly distributed, wrapping to a second row at 5+ */}
      <div className="mt-2.5 grid grid-cols-4 gap-x-2 gap-y-1.5">
        {winner.players.map((player, playerIndex) => {
          const { rank, suit } = parseCard(player.card);
          return (
            <div key={`${winner.id}-${playerIndex}`} className="flex flex-col items-center">
              <PlayingCard card={rank} suit={suit} size="xs" />
              <span className="mt-0.5 w-full truncate text-center text-[10px] leading-tight text-slate-500">
                {player.name}
              </span>
            </div>
          );
        })}
      </div>

      {winners.length > 1 && (
        <div className="mt-2 flex justify-between">
          <button
            type="button"
            onClick={() => setIndex((current) => (current - 1 + winners.length) % winners.length)}
            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setIndex((current) => (current + 1) % winners.length)}
            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
