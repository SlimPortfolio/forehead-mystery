"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, Menu, Trophy } from "lucide-react";
import HelpModal from "./HelpModal";

type HeaderActionsProps = {
  /** Intercept the Hall of Fame link click, e.g. to confirm before leaving an
   * active game. Omitted on pages (like /winners itself) that need no guard. */
  onWinnersNavigate?: (event: { preventDefault: () => void }) => void;
};

/** Shared header popover (Hall of Fame + Help) rendered by every screen's
 * AppHeader, so the header looks and behaves identically whether you're in
 * the game view or on the /winners page. */
export default function HeaderActions({
  onWinnersNavigate,
}: HeaderActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Site menu"
        aria-expanded={isOpen}
        title="Menu"
        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ${
          isOpen
            ? "bg-slate-200 text-slate-700"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            href="/winners"
            onNavigate={(event) => {
              setIsOpen(false);
              onWinnersNavigate?.(event);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-base text-slate-800 transition-colors hover:bg-slate-100"
          >
            <Trophy className="h-5 w-5 text-amber-500" strokeWidth={1.75} />
            Hall of Fame
          </Link>
          <button
            onClick={() => {
              setIsOpen(false);
              setShowHelp(true);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-base text-slate-800 transition-colors hover:bg-slate-100"
          >
            <HelpCircle
              className="h-5 w-5 text-slate-500"
              strokeWidth={1.75}
            />
            Help
          </button>
        </div>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
