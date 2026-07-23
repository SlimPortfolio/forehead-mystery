import Modal from "./Modal";

type HelpModalProps = {
  onClose: () => void;
};

const ITEMS = [
  "Each player sees everyone else's cards, but their own remains hidden.",
  "Rank yourself each round, then submit a guess for your own card on your turn.",
  "Open the Scratchpad to privately mark cards as possible, impossible, or most likely — it stays on your device only.",
  "Tap the ⓘ next to a player to open their Window View and see the game from their seat.",
  "Use Emote to send some friendly trash talk to the table.",
];

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <Modal title="How it works" onClose={onClose}>
      <ul className="space-y-3 text-sm text-slate-600">
        {ITEMS.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-slate-400">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
