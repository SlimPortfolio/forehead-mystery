import { GamePhase } from "./types";

type ActionBarProps = {
  phase: GamePhase;
  isMyTurn: boolean;
  onSelectRank: () => void;
  onOpenScratchpad: () => void;
  onGuessCard: () => void;
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

function ActionButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold ${
        disabled ? "text-slate-300" : "text-slate-800"
      }`}
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
}: ActionBarProps) {
  const canRank = phase === "ranking" && isMyTurn;
  const canGuess = phase === "guessing" && isMyTurn;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg divide-x divide-slate-200">
        <ActionButton icon={<RankIcon />} label="Select Rank" disabled={!canRank} onClick={onSelectRank} />
        <ActionButton
          icon={<ScratchpadIcon />}
          label="Open Scratchpad"
          disabled={false}
          onClick={onOpenScratchpad}
        />
        <ActionButton icon={<GuessIcon />} label="Guess Card" disabled={!canGuess} onClick={onGuessCard} />
      </div>
    </div>
  );
}
