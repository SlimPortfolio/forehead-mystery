// Client-side celebratory confetti for the victory (perfect-game) screen.
// Driven from synced room state in the page component — same as the sound
// cues — so every connected client sees the burst, not just the host.

import confetti from "canvas-confetti";

/** Stream a gentle celebratory confetti flow from both bottom corners. Runs a
 * bit longer than the re-pop interval in the page so successive bursts overlap
 * and there's always some confetti on screen. A light per-frame particle count
 * keeps the overlap from piling up. Client-only; safe to call from an effect
 * (no-op server-side since effects don't run there). */
export function fireVictoryConfetti() {
  if (typeof window === "undefined") return;

  // Paired with VICTORY_CONFETTI_INTERVAL_MS (6s) in the page; the trailing
  // particles from each burst carry over the gap to the next.
  const durationMs = 4500;
  const end = Date.now() + durationMs;
  const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#a855f7"];

  (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 60,
      startVelocity: 55,
      origin: { x: 0, y: 1 },
      colors,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 60,
      startVelocity: 55,
      origin: { x: 1, y: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
