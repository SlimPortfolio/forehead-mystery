import Modal from "./Modal";

type GuessCardModalProps = {
  guessingCards: string[];
  pendingGuess: string | null;
  onSelectCard: (card: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export default function GuessCardModal({
  guessingCards,
  pendingGuess,
  onSelectCard,
  onConfirm,
  onClose,
}: GuessCardModalProps) {
  return (
    <Modal title="Choose the card you believe you hold." onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        {guessingCards.map((card) => (
          <button
            key={card}
            onClick={() => onSelectCard(card)}
            className={`rounded-2xl border px-3 py-2 text-sm font-medium ${
              pendingGuess === card
                ? "border-amber-400 bg-amber-100 text-amber-800"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {card}
          </button>
        ))}
      </div>
      {pendingGuess && (
        <button
          onClick={onConfirm}
          className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-2.5 font-semibold text-white"
        >
          Confirm: {pendingGuess}
        </button>
      )}
    </Modal>
  );
}
