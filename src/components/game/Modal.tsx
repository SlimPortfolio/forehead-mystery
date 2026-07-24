import {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type ModalProps = {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Extra header button(s) rendered left of the close X, e.g. a "Clear" action. */
  headerAction?: ReactNode;
  /** Secondary row under the title bar, e.g. the target player's card + rank. */
  subheader?: ReactNode;
  /** Max-width utility for the dialog panel. Defaults to a compact `max-w-lg`. */
  maxWidthClassName?: string;
};

// Drag past this far, or fast enough, and the sheet finishes closing instead of snapping back.
const DRAG_CLOSE_PX = 120;
const DRAG_CLOSE_VELOCITY = 0.5; // px/ms

// Starting offset for the open animation — the sheet slides up from here into place.
const ENTER_OFFSET_PX = 24;

/** Shared overlay shell: click the backdrop or the X to close, body scrolls internally. */
export default function Modal({
  title,
  onClose,
  children,
  headerAction,
  subheader,
  maxWidthClassName = "max-w-lg",
}: ModalProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dragStartRef = useRef<{ y: number; time: number } | null>(null);

  // Two rAFs so the initial (offset) styles paint before we flip to the open state,
  // otherwise the browser coalesces both and the transition never plays.
  useEffect(() => {
    const first = requestAnimationFrame(() => {
      const second = requestAnimationFrame(() => setIsOpen(true));
      return () => cancelAnimationFrame(second);
    });
    return () => cancelAnimationFrame(first);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStartRef.current = { y: event.clientY, time: performance.now() };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    // Only drag downward — resist/ignore upward swipes so the sheet can't fly off the top.
    setDragY(Math.max(0, event.clientY - dragStartRef.current.y));
  };

  const endDrag = () => {
    if (!dragStartRef.current) return;
    const elapsed = performance.now() - dragStartRef.current.time;
    const velocity = dragY / Math.max(elapsed, 1);
    dragStartRef.current = null;
    setIsDragging(false);
    if (dragY > DRAG_CLOSE_PX || velocity > DRAG_CLOSE_VELOCITY) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  const backdropOpacity = isOpen ? Math.max(0, 1 - dragY / 400) : 0;
  const translateY = isOpen ? dragY : ENTER_OFFSET_PX;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      style={{
        opacity: backdropOpacity,
        transition: isDragging ? "none" : "opacity 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-3xl ${maxWidthClassName}`}
        style={{
          transform: translateY ? `translateY(${translateY}px)` : undefined,
          opacity: isOpen ? 1 : 0,
          transition: isDragging
            ? "none"
            : "transform 0.2s ease-out, opacity 0.2s ease-out",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex-shrink-0 touch-none border-b border-slate-100 p-4"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mx-auto -mt-1 mb-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
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
