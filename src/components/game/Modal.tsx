import { ReactNode } from "react";

type ModalProps = {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  headerExtra?: ReactNode;
};

/** Shared full-screen overlay shell used by all bottom-action-bar modals. */
export default function Modal({ title, onClose, children, headerExtra }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-sm sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {headerExtra}
        </div>
        <div className="mt-4">{children}</div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-center font-medium text-slate-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
