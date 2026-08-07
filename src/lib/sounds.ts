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
    audio.loop = LOOPING_SOUNDS[sound] ?? false;
    // Elements REST SILENT. `playSound` arms the real volume/gain immediately
    // before it plays — see `arm` for why audibility is never left switched on.
    audio.muted = true;
    audio.volume = 0;
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
    // Starts silent like the element itself; `arm` applies the real boost. This
    // matters more than the element's own `muted`/`volume`, which stop being
    // authoritative once the element is routed through the graph.
    gainNode.gain.value = 0;
    source.connect(gainNode).connect(audioContext.destination);
    gainNodes[sound] = gainNode;
    wiredSounds.add(sound);
  } catch {
    // Already wired elsewhere or unsupported — fall back to plain playback.
    wiredSounds.add(sound);
  }
}

/** Force a sound fully silent: muted element, zero element volume, and a zeroed
 * gain node when it's routed through the Web Audio graph (where the element's
 * own `muted`/`volume` stop being authoritative). This is the RESTING state for
 * every sound — going silent is always safe, so this can be called at any time. */
function silence(sound: GameSound, audio: HTMLAudioElement) {
  audio.muted = true;
  audio.volume = 0;
  const gainNode = gainNodes[sound];
  if (gainNode) gainNode.gain.value = 0;
}

/** Make a sound audible at its configured level. Called ONLY from `playSound`,
 * in the same tick as the `play()` that's meant to be heard.
 *
 * Audibility is armed here — never at prime/stop time — because `pause()` does
 * not reach the audio renderer synchronously. It flips `paused` right away, but
 * the render thread stops at its next callback boundary (~10ms locally, 100ms+
 * over Bluetooth or a shared-mode WASAPI device). Restoring volume/mute/gain
 * alongside a `pause()` could therefore let the head of the file through before
 * playback had actually stopped, which is exactly how priming used to leak an
 * audible cue on first page load. Arming only where sound is intended makes that
 * race impossible: an un-triggered sound is never in an audible state. */
function arm(sound: GameSound, audio: HTMLAudioElement) {
  audio.muted = false;
  audio.volume = SOUND_VOLUMES[sound] ?? 1;
  const gainNode = gainNodes[sound];
  if (gainNode) gainNode.gain.value = SOUND_GAINS[sound] ?? 1;
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

/** Prime one element with a silent play so later programmatic playback is allowed
 * by the autoplay policy — without ever being audible.
 *
 * The element is silenced going in and DELIBERATELY LEFT SILENT afterwards; only
 * `playSound` ever arms it (see `arm` for the race that re-arming here caused).
 * Note the settle handler runs on rejection too: a `play()` that the autoplay
 * policy refuses can still leave a pending play request on the element, so it
 * gets the same pause/rewind/re-silence treatment as a successful one. */
function primeSilently(sound: GameSound, audio: HTMLAudioElement) {
  silence(sound, audio);

  const settle = () => {
    audio.pause();
    audio.currentTime = 0;
    // Re-assert silence rather than restoring audibility — the whole point.
    silence(sound, audio);
  };

  audio.play().then(settle).catch(settle);
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
//  * start playback without its own gesture.
//  *
//  * Same rule as the sound effects: decide whether music is wanted BEFORE
//  * unmuting, and never unmute alongside a `pause()` — see `arm`. */
// function primeMusic() {
//   const music = getMusicAudio();
//   if (!music) return;
//   music.muted = true;
//   music.volume = 0;
//   const settle = () => {
//     if (loadMusicMuted()) {
//       // Not wanted — stop and stay silent. `setMusicMuted(false)` starts it.
//       music.pause();
//       music.currentTime = 0;
//       return;
//     }
//     // Wanted, and still playing from the prime — safe to make it audible.
//     music.muted = false;
//     music.volume = MUSIC_VOLUME;
//   };
//   music.play().then(settle).catch(settle);
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
  // This is the only place a sound is ever made audible, and it happens in the
  // same tick as the play it belongs to — so nothing can be heard that wasn't
  // triggered by a real game event.
  arm(sound, audio);
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
  // Back to the resting state, so a stopped sound can't be audible through a
  // pause that hasn't reached the audio renderer yet.
  silence(sound, audio);
}
