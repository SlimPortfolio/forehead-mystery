type CorrectGuessPopupProps = {
  playerName: string;
  closing: boolean;
};

/** Celebratory overlay shown briefly after a correct guess, then fades out. */
export default function CorrectGuessPopup({ playerName, closing }: CorrectGuessPopupProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div
        className={`rounded-3xl bg-emerald-500 px-8 py-6 text-center shadow-2xl transition-opacity duration-300 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-3xl font-extrabold tracking-tight text-white">BINKED IT!</p>
        <p className="mt-1 text-sm font-semibold text-emerald-50">
          {playerName} correctly identified their card!
        </p>
      </div>
    </div>
  );
}
