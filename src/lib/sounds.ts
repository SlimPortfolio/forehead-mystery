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

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND MUSIC — feature-complete but disabled until we have a music track.
// To enable: uncomment this block, the music-mute functions, the getMusicAudio/
// primeMusic helpers + `primeMusic()` call below, and the music toggle in
// HeaderActions.tsx. Drop the track into `public/sounds/music-loop.m4a`. (The
// audio session is already "playback", so the game's own music will mix over
// the sound effects with no further change.)
//
// const MUSIC_FILE = "/sounds/music-loop.m4a";
// const MUSIC_VOLUME = 0.3;
// const MUSIC_MUTE_STORAGE_KEY = "forehead-mystery:music-muted";
//
// // Music preference + element mirror the sound-effect state above.
// let musicMuted: boolean | null = null;
// const musicMuteListeners = new Set<() => void>();
// let musicAudio: HTMLAudioElement | null = null;
// ─────────────────────────────────────────────────────────────────────────────

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

// BACKGROUND MUSIC (disabled — see the banner near the top of this file):
// function loadMusicMuted(): boolean {
//   if (musicMuted !== null) return musicMuted;
//   if (typeof window === "undefined") return false;
//   musicMuted = window.localStorage.getItem(MUSIC_MUTE_STORAGE_KEY) === "true";
//   return musicMuted;
// }
//
// /** Persist the music on/off preference, notify subscribers, and start or stop
//  * the live track to match. */
// export function setMusicMuted(value: boolean) {
//   musicMuted = value;
//   if (typeof window !== "undefined") {
//     window.localStorage.setItem(MUSIC_MUTE_STORAGE_KEY, String(value));
//   }
//   // Reflect the change on the running element. If unlock hasn't happened yet
//   // the element doesn't exist; `unlockSounds` will read the preference then.
//   if (musicAudio) {
//     if (value) {
//       musicAudio.pause();
//     } else if (unlocked) {
//       musicAudio.play().catch(() => {});
//     }
//   }
//   musicMuteListeners.forEach((listener) => listener());
// }
//
// export function subscribeMusicMuted(listener: () => void): () => void {
//   musicMuteListeners.add(listener);
//   return () => {
//     musicMuteListeners.delete(listener);
//   };
// }
//
// export function getMusicMutedSnapshot(): boolean {
//   return loadMusicMuted();
// }
//
// export function getMusicMutedServerSnapshot(): boolean {
//   return false;
// }

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

  // Set the page's audio session to "playback" so our sound effects stay audible
  // even when the phone's ringer/silent switch is off. Trade-off: this pauses the
  // user's own background music (Spotify, etc.) while our audio owns the session.
  // Guarded because the API only exists in Safari 16.4+ (a no-op elsewhere).
  const audioSession = (
    navigator as Navigator & { audioSession?: { type: string } }
  ).audioSession;
  if (audioSession) {
    try {
      audioSession.type = "playback";
    } catch {
      // Ignore unsupported values / read-only failures.
    }
  }

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

  // primeMusic(); // BACKGROUND MUSIC disabled — see the banner near the top.
}

// BACKGROUND MUSIC (disabled — see the banner near the top of this file):
// function getMusicAudio(): HTMLAudioElement | null {
//   if (typeof window === "undefined") return null;
//   if (!musicAudio) {
//     musicAudio = new Audio(MUSIC_FILE);
//     musicAudio.preload = "auto";
//     musicAudio.loop = true;
//     musicAudio.volume = MUSIC_VOLUME;
//   }
//   return musicAudio;
// }
//
// /** Unlock the music element within the user gesture, then leave it playing
//  * unless music is muted. Priming (a muted play) is what lets a later unmute
//  * start playback without its own gesture. */
// function primeMusic() {
//   const music = getMusicAudio();
//   if (!music) return;
//   music.muted = true;
//   music
//     .play()
//     .then(() => {
//       music.muted = false;
//       if (loadMusicMuted()) {
//         music.pause();
//         music.currentTime = 0;
//       }
//     })
//     .catch(() => {
//       music.muted = false;
//     });
// }

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
