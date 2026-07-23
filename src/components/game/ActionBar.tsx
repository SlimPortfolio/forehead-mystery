import { useEffect, useRef, useState } from "react";
import { EMOTE_OPTIONS, GamePhase } from "./types";

type ActionBarProps = {
  phase: GamePhase;
  isMyTurn: boolean;
  onSelectRank: () => void;
  onOpenScratchpad: () => void;
  onGuessCard: () => void;
  onSendEmote: (text: string) => void;
};

function RankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 20V14M10 20V10M16 20V6M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScratchpadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 4h13l3 3v13H4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

function GuessIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d="M4 5h16v11H8l-4 4V5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionButton({
  icon,
  label,
  disabled,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-16 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-semibold whitespace-nowrap disabled:cursor-not-allowed ${
        disabled ? "text-slate-300" : "text-slate-800"
      } ${active ? "bg-slate-200" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Fixed bottom action bar: disabled state depends on phase + whose turn it is. */
export default function ActionBar({
  phase,
  isMyTurn,
  onSelectRank,
  onOpenScratchpad,
  onGuessCard,
  onSendEmote,
}: ActionBarProps) {
  const [isEmoteOpen, setIsEmoteOpen] = useState(false);
  const emoteWrapperRef = useRef<HTMLDivElement>(null);
  const canRank = phase === "ranking" && isMyTurn;
  const canGuess = phase === "guessing" && isMyTurn;

  // Close on any click/tap outside the button+popover — the toggle button's
  // own click is inside this wrapper, so it still closes via its own onClick
  // instead of double-toggling.
  useEffect(() => {
    if (!isEmoteOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (emoteWrapperRef.current && !emoteWrapperRef.current.contains(event.target as Node)) {
        setIsEmoteOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isEmoteOpen]);

  return (
    <div className="relative z-40 w-full flex-shrink-0 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg divide-x divide-slate-200">
        <ActionButton icon={<RankIcon />} label="Rank" disabled={!canRank} onClick={onSelectRank} />
        <ActionButton
          icon={<ScratchpadIcon />}
          label="Scratchpad"
          disabled={false}
          onClick={onOpenScratchpad}
        />
        <ActionButton icon={<GuessIcon />} label="Guess" disabled={!canGuess} onClick={onGuessCard} />
        <div ref={emoteWrapperRef} className="relative flex flex-1">
          {isEmoteOpen && (
            <div className="absolute bottom-full right-0 z-50 mb-2 flex max-h-[60vh] w-56 flex-col gap-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {EMOTE_OPTIONS.map((text) => (
                <button
                  key={text}
                  onClick={() => {
                    onSendEmote(text);
                    setIsEmoteOpen(false);
                  }}
                  className="cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {text}
                </button>
              ))}
            </div>
          )}
          <ActionButton
            icon={<ChatIcon />}
            label="Emote"
            disabled={false}
            active={isEmoteOpen}
            onClick={() => setIsEmoteOpen((open) => !open)}
          />
        </div>
      </div>
    </div>
  );
}
