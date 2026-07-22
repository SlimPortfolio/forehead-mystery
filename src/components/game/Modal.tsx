import { ReactNode } from "react";

type ModalProps = {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Extra header button(s) rendered left of the close X, e.g. a "Clear" action. */
  headerAction?: ReactNode;
  /** Secondary row under the title bar, e.g. the target player's card + rank. */
  subheader?: ReactNode;
};

/** Shared overlay shell: click the backdrop or the X to close, body scrolls internally. */
export default function Modal({ title, onClose, children, headerAction, subheader }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <div className="flex flex-shrink-0 items-center gap-2">
              {headerAction}
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-slate-500 hover:bg-slate-100"
              >
                &times;
              </button>
            </div>
          </div>
          {subheader && <div className="mt-3">{subheader}</div>}
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
