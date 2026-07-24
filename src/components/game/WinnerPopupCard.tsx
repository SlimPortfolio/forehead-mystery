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

export default function WinnerPopupCard({ winners }: WinnerPopupCardProps) {
  const [index, setIndex] = useState(0);
  const winner = winners[index];

  return (
    <div className="w-56">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-ink">{winner.teamName}</p>
        {winners.length > 1 && (
          <span className="whitespace-nowrap text-xs text-slate-500">
            {index + 1} / {winners.length}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600">
        {winner.date} &middot; {winner.time}
      </p>
      <p className="text-xs text-slate-600">{winner.location}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {winner.players.map((player, playerIndex) => {
          const { rank, suit } = parseCard(player.card);
          return (
            <div key={`${winner.id}-${playerIndex}`} className="flex flex-col items-center">
              <PlayingCard card={rank} suit={suit} size="xs" />
              <span className="mt-0.5 max-w-[3.5rem] truncate text-[10px] text-slate-500">
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
