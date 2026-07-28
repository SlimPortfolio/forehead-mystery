"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type ToastData = {
  id: string;
  message: string;
  /** Cosmetic accent — "join" reads green, "leave" reads light red. */
  tone: "join" | "leave";
};

const AUTO_DISMISS_MS = 4000;
// How long the fade in/out transition runs (kept in sync with the CSS below).
const FADE_MS = 220;
// Drag this many px horizontally (either direction) to flick a toast away.
const SWIPE_DISMISS_PX = 80;

type ToastItemProps = {
  toast: ToastData;
  onDismiss: (id: string) => void;
};

/** A single dismissible toast: fades in on mount, auto-clears after a few
 * seconds, closes on the X button, and can be flicked away horizontally with a
 * pointer/touch swipe. Dismissal fades out before the toast is removed. */
function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const startXRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  // Fade out first, then remove once the transition has had time to play.
  const beginDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setVisible(false);
    window.setTimeout(() => onDismiss(toast.id), FADE_MS);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    // Flip to visible on the next frame so the mount transition animates.
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = window.setTimeout(beginDismiss, AUTO_DISMISS_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [beginDismiss]);

  const handlePointerDown = (event: React.PointerEvent) => {
    startXRef.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (startXRef.current === null) return;
    setDragX(event.clientX - startXRef.current);
  };

  const handlePointerUp = () => {
    if (Math.abs(dragX) > SWIPE_DISMISS_PX) {
      beginDismiss();
      return;
    }
    startXRef.current = null;
    setDragging(false);
    setDragX(0);
  };

  const accent =
    toast.tone === "join"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-rose-200 bg-rose-50 text-rose-700";

  // Reduce opacity as the toast is dragged away; while hidden (entering or
  // leaving) the fade transition owns opacity instead.
  const swipeOpacity =
    1 - Math.min(Math.abs(dragX) / (SWIPE_DISMISS_PX * 2), 0.7);

  return (
    <div
      role="status"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate(${dragX}px, ${visible ? 0 : -8}px)`,
        opacity: visible ? swipeOpacity : 0,
        transition: dragging
          ? "none"
          : `transform ${FADE_MS}ms ease, opacity ${FADE_MS}ms ease`,
        touchAction: "pan-y",
      }}
      className={`pointer-events-auto flex w-full max-w-sm cursor-grab touch-none items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium shadow-lg backdrop-blur active:cursor-grabbing ${accent}`}
    >
      <span className="min-w-0 flex-1 truncate">{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => beginDismiss()}
        // Stop the click from starting a drag on the parent.
        onPointerDown={(event) => event.stopPropagation()}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-current/60 hover:bg-black/5"
      >
        <X className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

type ToastStackProps = {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
};

/** Fixed, centered stack of toasts positioned below the app header so the
 * header bar stays visible and accessible. */
export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
