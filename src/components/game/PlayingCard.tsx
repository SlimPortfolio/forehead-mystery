"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type PlayingCardProps = {
  card?: string | null;
  suit?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

/** Special-deck art theme, toggled on via the ?bok-special URL param. */
const SPECIAL_THEME = "camp";

/** CARD_POOL rank -> filename prefix used under public/cards/<theme>/. Only
 * the ace differs from its own rank label (deck assets use "1", not "A"). */
const CARD_FILE_KEYS: Record<string, string> = {
  A: "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "J",
  Q: "Q",
  K: "K",
};

function getCardImageSrc(card: string, theme: string) {
  const fileKey = CARD_FILE_KEYS[card] ?? card;
  return `/cards/${theme}/${fileKey}-${theme}-card.png`;
}

/** Reads the ?bok-special URL param on mount to opt into the special deck
 * art. Starts false so server and first client render match, then flips
 * after mount once window.location is available. */
function useBokSpecial() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).has("bok-special"));
  }, []);
  return enabled;
}

const SIZE_CLASSES: Record<NonNullable<PlayingCardProps["size"]>, string> = {
  xs: "h-10 w-7 text-base",
  sm: "h-12 w-9 text-xl",
  md: "h-16 w-12 text-2xl",
  lg: "h-20 w-14 text-3xl",
};

const LOGO_SIZE_CLASSES: Record<NonNullable<PlayingCardProps["size"]>, string> = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/** Suit is passed in by the caller (one suit per game, not per card) and
 * only affects rank/pip color. */
export default function PlayingCard({ card, suit = "♦", size = "md" }: PlayingCardProps) {
  const isHidden = !card;
  const display = card ?? "?";
  const isRed = suit === "♦" || suit === "♥";
  const isSpecial = useBokSpecial();

  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-sm ${SIZE_CLASSES[size]}`}
    >
      <span
        className={`font-bold leading-none ${
          isHidden ? "text-slate-400" : isRed ? "text-rose-600" : "text-ink"
        }`}
      >
        {display}
      </span>
      {isHidden ? (
        <span className="leading-none text-slate-300">{""}</span>
      ) : isSpecial ? (
        <div className={`relative mt-0.5 ${LOGO_SIZE_CLASSES[size]}`}>
          <Image src={getCardImageSrc(display, SPECIAL_THEME)} alt="" fill sizes="40px" className="object-contain" />
        </div>
      ) : (
        <span className={`leading-none ${isRed ? "text-rose-600" : "text-ink"}`}>{suit}</span>
      )}
    </div>
  );
}
