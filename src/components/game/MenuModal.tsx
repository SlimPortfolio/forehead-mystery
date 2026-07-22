import Modal from "./Modal";

type MenuModalProps = {
  onLeaveGame: () => void;
  onClose: () => void;
};

export default function MenuModal({ onLeaveGame, onClose }: MenuModalProps) {
  return (
    <Modal title="Menu" onClose={onClose}>
      <button
        onClick={onLeaveGame}
        className="w-full rounded-2xl bg-rose-700 px-4 py-2.5 font-semibold text-white"
      >
        Leave Game
      </button>
    </Modal>
  );
}
