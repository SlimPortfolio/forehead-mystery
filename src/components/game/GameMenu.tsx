"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { LogOut, RefreshCw, Share, UserX, XCircle } from "lucide-react";

type GameMenuProps = {
  isHost: boolean;
  shareUrl: string;
  onStartNextGame: () => void;
  onEndGame: () => void;
  onRemovePlayer: () => void;
  onLeaveGame: () => void;
};

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-base transition-colors ${
        danger
          ? "text-rose-700 hover:bg-rose-50"
          : "text-slate-800 hover:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/** The in-game 3-dot menu: a small anchored popover (not a full-screen
 * drawer) so it stays snappy for quick host actions. Host gets full
 * room-management options; everyone else just gets the share link and
 * leave-game action (ending the room already covers "leaving" for the host). */
export default function GameMenu({
  isHost,
  shareUrl,
  onStartNextGame,
  onEndGame,
  onRemovePlayer,
  onLeaveGame,
}: GameMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const runAndClose = (action: () => void) => () => {
    setIsOpen(false);
    action();
  };

  // Deliberately doesn't close the menu, so the "Link copied!" confirmation
  // is visible before the popover goes away.
  const handleShareLink = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setJustCopied(true);
        if (copyResetRef.current) clearTimeout(copyResetRef.current);
        copyResetRef.current = setTimeout(() => setJustCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Menu"
        aria-expanded={isOpen}
        className={`cursor-pointer rounded-full px-2 py-1 text-2xl leading-none transition-colors ${
          isOpen
            ? "bg-slate-200 text-slate-700"
            : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        &#8942;
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-40 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {isHost && (
            <>
              <MenuItem
                icon={
                  <RefreshCw
                    className="h-5 w-5 text-emerald-600"
                    strokeWidth={1.75}
                  />
                }
                label="Start new game"
                onClick={runAndClose(onStartNextGame)}
              />
              <MenuItem
                icon={
                  <UserX className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
                }
                label="Remove player from room"
                onClick={runAndClose(onRemovePlayer)}
              />
            </>
          )}
          <MenuItem
            icon={
              <Share className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
            }
            label={justCopied ? "Link copied!" : "Share link for the game"}
            onClick={handleShareLink}
          />
          <div className="my-1 h-px bg-slate-100" />
          {isHost ? (
            <MenuItem
              icon={<XCircle className="h-5 w-5" strokeWidth={1.75} />}
              label="End game and close room"
              danger
              onClick={runAndClose(onEndGame)}
            />
          ) : (
            <MenuItem
              icon={<LogOut className="h-5 w-5" strokeWidth={1.75} />}
              label="Leave Game"
              danger
              onClick={runAndClose(onLeaveGame)}
            />
          )}
        </div>
      )}
    </div>
  );
}
