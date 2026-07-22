type CorrectGuessPopupProps = {
  playerName: string;
};

/** Celebratory overlay shown while the confirmation banner is up after a correct guess. */
export default function CorrectGuessPopup({ playerName }: CorrectGuessPopupProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="animate-bounce rounded-3xl bg-emerald-500 px-8 py-6 text-center shadow-2xl">
        <p className="text-3xl font-extrabold tracking-tight text-white">BINKED IT!</p>
        <p className="mt-1 text-sm font-semibold text-emerald-50">
          {playerName} correctly identified their card!
        </p>
      </div>
    </div>
  );
}
