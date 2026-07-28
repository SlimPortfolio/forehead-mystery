// Client-side sound-effect layer for game events. All playback is driven from
// synced room state in the page component, so every connected client hears the
// same cues — not just whoever performed the action.
//
// Browsers block audio until the user has interacted with the page, so nothing
// plays until `unlockSounds()` runs off the first pointer/key event. Until then
// (and if a file is missing) `playSound` is a silent no-op.

export type GameSound = "turnChange" | "correct" | "incorrect";

// Drop the matching files into `public/sounds/`. Paths are public-root relative.
const SOUND_FILES: Record<GameSound, string> = {
  turnChange: "/sounds/thwack.m4a",
  correct: "/sounds/bing.m4a",
  incorrect: "/sounds/quack.mp3",
};

// Per-sound playback volume, 0–1. Omitted sounds default to 1 (100%).
const SOUND_VOLUMES: Partial<Record<GameSound, number>> = {
  correct: 0.5,
};

const MUTE_STORAGE_KEY = "forehead-mystery:muted";

const audioCache: Partial<Record<GameSound, HTMLAudioElement>> = {};
let unlocked = false;
// null until first read; then mirrors the persisted preference.
let muted: boolean | null = null;
const muteListeners = new Set<() => void>();

function loadMuted(): boolean {
  if (muted !== null) return muted;
  if (typeof window === "undefined") return false;
  muted = window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";
  return muted;
}

/** Persist the mute preference and notify subscribers. */
export function setSoundMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(value));
  }
  muteListeners.forEach((listener) => listener());
}

// External-store hooks for `useSyncExternalStore`, so components can read/reflect
// the mute preference without a setState-in-effect or a hydration mismatch.
export function subscribeMuted(listener: () => void): () => void {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}

export function getMutedSnapshot(): boolean {
  return loadMuted();
}

export function getMutedServerSnapshot(): boolean {
  return false;
}

function getAudio(sound: GameSound): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let audio = audioCache[sound];
  if (!audio) {
    audio = new Audio(SOUND_FILES[sound]);
    audio.preload = "auto";
    audio.volume = SOUND_VOLUMES[sound] ?? 1;
    audioCache[sound] = audio;
  }
  return audio;
}

/** Satisfy the browser's autoplay gesture requirement. Call once, from within a
 * real user interaction (click/tap/keydown). Safe to call repeatedly. */
export function unlockSounds() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;

  // Prime each element within the gesture so later programmatic plays are allowed.
  (Object.keys(SOUND_FILES) as GameSound[]).forEach((sound) => {
    const audio = getAudio(sound);
    if (!audio) return;
    audio.muted = true;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = false;
      });
  });
}

/** Play a game sound. No-op before `unlockSounds()`, when muted, or if the file
 * is missing. */
export function playSound(sound: GameSound) {
  if (!unlocked || loadMuted()) return;
  const audio = getAudio(sound);
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Autoplay still blocked or file missing — fail silently.
  });
}
