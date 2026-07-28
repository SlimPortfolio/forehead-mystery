"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  HelpCircle,
  Menu,
  // Music, // BACKGROUND MUSIC disabled — see sounds.ts
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  getMutedServerSnapshot,
  getMutedSnapshot,
  setSoundMuted,
  subscribeMuted,
  // BACKGROUND MUSIC disabled — see sounds.ts
  // getMusicMutedServerSnapshot,
  // getMusicMutedSnapshot,
  // setMusicMuted,
  // subscribeMusicMuted,
} from "@/lib/sounds";

type HeaderActionsProps = {
  /** Intercept the Hall of Fame link click, e.g. to confirm before leaving an
   * active game. Omitted on pages (like /winners itself) that need no guard. */
  onWinnersNavigate?: (event: { preventDefault: () => void }) => void;
  /** Open the shared How to Play modal. Rendered by the page itself (rather
   * than locally here) so it isn't nested inside the header's backdrop-blur,
   * which would otherwise become the containing block for its fixed overlay. */
  onShowHelp: () => void;
};

/** Shared header popover (Hall of Fame + Help) rendered by every screen's
 * AppHeader, so the header looks and behaves identically whether you're in
 * the game view or on the /winners page. */
export default function HeaderActions({
  onWinnersNavigate,
  onShowHelp,
}: HeaderActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Reflects the persisted mute preference; server snapshot is false so the
  // markup matches on hydration, then updates to the stored value.
  const muted = useSyncExternalStore(
    subscribeMuted,
    getMutedSnapshot,
    getMutedServerSnapshot,
  );
  // BACKGROUND MUSIC disabled — see sounds.ts
  // const musicMuted = useSyncExternalStore(
  //   subscribeMusicMuted,
  //   getMusicMutedSnapshot,
  //   getMusicMutedServerSnapshot,
  // );

  const toggleMute = () => setSoundMuted(!muted);
  // const toggleMusic = () => setMusicMuted(!musicMuted);

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
          <Link
            href="/data"
            onNavigate={() => setIsOpen(false)}
            className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-base text-slate-800 transition-colors hover:bg-slate-100"
          >
            <BarChart3 className="h-5 w-5 text-indigo-500" strokeWidth={1.75} />
            Data
          </Link>
          <button
            onClick={() => {
              setIsOpen(false);
              onShowHelp();
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-base text-slate-800 transition-colors hover:bg-slate-100"
          >
            <HelpCircle
              className="h-5 w-5 text-slate-500"
              strokeWidth={1.75}
            />
            Help
          </button>
          <button
            onClick={toggleMute}
            className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-base text-slate-800 transition-colors hover:bg-slate-100"
          >
            {muted ? (
              <VolumeX className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
            ) : (
              <Volume2 className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
            )}
            {muted ? "Unmute sound effects" : "Mute sound effects"}
          </button>
          {/* BACKGROUND MUSIC disabled — see sounds.ts
          <button
            onClick={toggleMusic}
            className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-base text-slate-800 transition-colors hover:bg-slate-100"
          >
            <Music
              className={`h-5 w-5 ${musicMuted ? "text-slate-300" : "text-slate-500"}`}
              strokeWidth={1.75}
            />
            {musicMuted ? "Turn music on" : "Turn music off"}
          </button>
          */}
        </div>
      )}
    </div>
  );
}
