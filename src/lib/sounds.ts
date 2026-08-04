// Client-side sound-effect layer for game events. All playback is driven from
// synced room state in the page component, so every connected client hears the
// same cues — not just whoever performed the action.
//
// Browsers block audio until the user has interacted with the page, so nothing
// plays until `unlockSounds()` runs off the first pointer/key event. Until then
// (and if a file is missing) `playSound` is a silent no-op.

export type GameSound =
  | "turnChange"
  | "correct"
  | "incorrect"
  | "cardFlip"
  | "yourMove"
  | "victory";

// Drop the matching files into `public/sounds/`. Paths are public-root relative.
const SOUND_FILES: Record<GameSound, string> = {
  turnChange: "/sounds/thwack.m4a",
  correct: "/sounds/bing.m4a",
  incorrect: "/sounds/quack.mp3",
  // Played once per card during the start-of-game deal-in reveal.
  cardFlip: "/sounds/flip-card.mp3",
  // Played (in place of thwack) when it becomes the local player's turn.
  yourMove: "/sounds/your-move.mp3",
  // Victory fanfare — played once for everyone on a perfect-game finish.
  victory: "/sounds/victory-bella-ciao.m4a",
};

// Per-sound playback volume, 0–1. Omitted sounds default to 1 (100%).
const SOUND_VOLUMES: Partial<Record<GameSound, number>> = {
  correct: 0.2,
  yourMove: 0.4,
  // A full track rather than a short cue — keep it in the background, not blaring.
  victory: 0.5,
  // Fires rapidly once per card as the hand deals in, so keep each flip gentle.
  cardFlip: 0.7,
};

// A plain <audio> element's volume maxes out at 1.0, so to make a sound LOUDER
// than the raw file we route it through the Web Audio graph and multiply it with
// a gain node (values > 1 amplify). Listed sounds get boosted; the rest play
// straight off the element. Keep boosts modest — too high just hard-clips.
const SOUND_GAINS: Partial<Record<GameSound, number>> = {
  turnChange: 1.6, // thwack — bumped up a touch above the raw file level.
};

// Sounds that repeat from the start when they finish, until `stopSound` is
// called. Everything else plays once through. The victory fanfare loops for as
// long as the perfect-game screen is up.
const LOOPING_SOUNDS: Partial<Record<GameSound, boolean>> = {
  victory: true,
};

const MUTE_STORAGE_KEY = "forehead-mystery:muted";

const audioCache: Partial<Record<GameSound, HTMLAudioElement>> = {};
// Shared Web Audio context + one gain node per boosted sound. Created lazily
// inside `unlockSounds` (must happen within a user gesture) and null until then.
let audioContext: AudioContext | null = null;
const gainNodes: Partial<Record<GameSound, GainNode>> = {};
// Elements already routed through the graph — `createMediaElementSource` may
// only be called once per element, ever.
const wiredSounds = new Set<GameSound>();
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
    audio.loop = LOOPING_SOUNDS[sound] ?? false;
    audioCache[sound] = audio;
  }
  // Wire boosted sounds into the gain graph once the context exists. If wiring
  // isn't possible (no context / unsupported) the element just plays unboosted,
  // so this can only ever ADD loudness — never break playback.
  wireGain(sound, audio);
  return audio;
}

/** Route a boosted sound's element through `source -> gain -> destination` so it
 * can play above unity volume. No-op for un-boosted sounds, before the context
 * exists, or if the element is already wired. */
function wireGain(sound: GameSound, audio: HTMLAudioElement) {
  const gain = SOUND_GAINS[sound];
  if (!gain || !audioContext || wiredSounds.has(sound)) return;
  try {
    const source = audioContext.createMediaElementSource(audio);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = gain;
    source.connect(gainNode).connect(audioContext.destination);
    gainNodes[sound] = gainNode;
    wiredSounds.add(sound);
  } catch {
    // Already wired elsewhere or unsupported — fall back to plain playback.
    wiredSounds.add(sound);
  }
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

  // Create + resume the shared Web Audio context inside this gesture so boosted
  // sounds can play later. Wrapped so an unsupported/blocked context never stops
  // the plain-element priming below from running.
  try {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (Ctor && !audioContext) audioContext = new Ctor();
    void audioContext?.resume?.().catch(() => {});
  } catch {
    audioContext = null;
  }

  // Prime each element within the gesture so later programmatic plays are
  // allowed. `getAudio` also wires the boosted sounds now that the context
  // exists.
  (Object.keys(SOUND_FILES) as GameSound[]).forEach((sound) => {
    const audio = getAudio(sound);
    if (!audio) return;
    primeSilently(sound, audio);
  });

  // primeMusic(); // BACKGROUND MUSIC disabled — see the banner near the top.
}

/** Prime one element with a muted play so later programmatic playback is allowed
 * by the autoplay policy — without ever being audible. We force silence three
 * ways (muted, element volume 0, and a zeroed gain node when routed through Web
 * Audio) because `muted`/`volume` on an element can be bypassed once it's wired
 * into the graph, which is exactly how a "prime" could leak a real cue. All
 * three are restored the moment the priming play resolves. */
function primeSilently(sound: GameSound, audio: HTMLAudioElement) {
  const gainNode = gainNodes[sound];
  const restoreVolume = audio.volume;
  const restoreGain = gainNode?.gain.value ?? null;

  audio.muted = true;
  audio.volume = 0;
  if (gainNode) gainNode.gain.value = 0;

  const restore = () => {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = restoreVolume;
    if (gainNode && restoreGain !== null) gainNode.gain.value = restoreGain;
  };

  audio.play().then(restore).catch(restore);
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
  // A boosted sound only reaches the speakers through the graph, so recover the
  // context if the OS suspended it (e.g. after a call/lock on mobile).
  if (audioContext?.state === "suspended") {
    void audioContext.resume().catch(() => {});
  }
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Autoplay still blocked or file missing — fail silently.
  });
}

/** Stop a sound and rewind it to the start. Used to end looping sounds like the
 * victory fanfare when its screen closes. No-op if the sound never played. */
export function stopSound(sound: GameSound) {
  const audio = audioCache[sound];
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}
