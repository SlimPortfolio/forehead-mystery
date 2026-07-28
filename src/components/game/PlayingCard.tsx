"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type PlayingCardProps = {
  card?: string | null;
  suit?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** When true, the card shows its patterned back and (with the flip wrapper)
   * animates a rotate-to-reveal when it later becomes false. Used for the
   * deal-in reveal at the start of a game. */
  faceDown?: boolean;
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

/** The patterned reverse of a card, shown while it's face-down. Fills its
 * parent face; the diagonal stripe pattern reads at every card size. */
function CardBack() {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg border-2 border-indigo-300 bg-indigo-500 shadow-sm">
      <div
        className="h-full w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 2px, transparent 2px, transparent 6px)",
        }}
      />
    </div>
  );
}

/** Suit is passed in by the caller (one suit per game, not per card) and
 * only affects rank/pip color. */
export default function PlayingCard({
  card,
  suit = "♦",
  size = "md",
  faceDown = false,
}: PlayingCardProps) {
  const isHidden = !card;
  const display = card ?? "?";
  const isRed = suit === "♦" || suit === "♥";
  const isSpecial = useBokSpecial();

  const front = (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-sm">
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

  return (
    <div className={`card-flip shrink-0 ${SIZE_CLASSES[size]}`}>
      <div className={`card-flip-inner ${faceDown ? "is-facedown" : ""}`}>
        <div className="card-face">{front}</div>
        <div className="card-face card-face-back">
          <CardBack />
        </div>
      </div>
    </div>
  );
}
