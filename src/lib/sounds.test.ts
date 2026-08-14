import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `sounds.ts` keeps module-level singleton state (audioCache, unlocked flag,
// mute preference, wired gain nodes...). Each test needs a completely fresh
// module instance, so we reset the module registry and re-import dynamically
// per test rather than importing once at the top of the file.

class MockAudio {
  static instances: MockAudio[] = [];
  src: string;
  currentTime = 0;
  volume = 1;
  muted = false;
  loop = false;
  preload = "";
  paused = true;
  playCallCount = 0;

  constructor(src: string) {
    this.src = src;
    MockAudio.instances.push(this);
  }

  play(): Promise<void> {
    this.playCallCount += 1;
    this.paused = false;
    // Resolves on the next microtask, same as real browsers resolving once
    // playback has actually begun (never synchronously).
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

function installMockAudio() {
  MockAudio.instances = [];
  vi.stubGlobal("Audio", MockAudio);
}

async function freshSounds() {
  vi.resetModules();
  installMockAudio();
  return await import("./sounds");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("unlockSounds / primeSilently", () => {
  it("does not leave the primed element audible merely from unlocking", async () => {
    const { unlockSounds } = await freshSounds();
    unlockSounds();

    for (const audio of MockAudio.instances) {
      // Priming must never leave a sound in a "currently playing" state —
      // nothing should be audible purely because unlockSounds() ran.
      expect(audio.paused).toBe(true);
      expect(audio.muted).toBe(false);
    }
  });

  // This is the regression test for the unlocked/priming race described in
  // the bug report: `unlocked` used to flip to `true` synchronously while
  // primeSilently()'s mute/volume-zeroing was still pending an async
  // `.play().then(restore)` round-trip. A real playSound() call landing in
  // that window inherited the *primed* (muted, volume 0) element state
  // instead of its real playback state, so the legitimate cue came out
  // silent until restore() eventually paused the element out from under it.
  it("plays audibly even when triggered in the same tick as unlockSounds()", async () => {
    const { unlockSounds, playSound } = await freshSounds();

    unlockSounds();
    playSound("cardFlip"); // no await — this is the racy window.

    const audio = MockAudio.instances.find((a) => a.src.includes("flip-card"));
    expect(audio).toBeDefined();
    expect(audio!.muted).toBe(false);
    expect(audio!.volume).toBeCloseTo(0.7); // SOUND_VOLUMES.cardFlip
    expect(audio!.paused).toBe(false);
  });

  it("is idempotent — calling it twice does not re-prime or double-play", async () => {
    const { unlockSounds } = await freshSounds();
    unlockSounds();
    const countsAfterFirst = MockAudio.instances.map((a) => a.playCallCount);
    unlockSounds();
    const countsAfterSecond = MockAudio.instances.map((a) => a.playCallCount);
    expect(countsAfterSecond).toEqual(countsAfterFirst);
  });
});

describe("playSound", () => {
  it("is a silent no-op before unlockSounds() has run", async () => {
    const { playSound } = await freshSounds();
    playSound("correct");
    expect(MockAudio.instances).toHaveLength(0);
  });

  it("does nothing while muted", async () => {
    const { unlockSounds, playSound, setSoundMuted } = await freshSounds();
    unlockSounds();
    setSoundMuted(true);
    const before = MockAudio.instances.map((a) => a.playCallCount);
    playSound("correct");
    const after = MockAudio.instances.map((a) => a.playCallCount);
    expect(after).toEqual(before);
  });

  it("stays silent when the underlying file is missing (play() rejects)", async () => {
    vi.resetModules();
    class RejectingAudio extends MockAudio {
      play(): Promise<void> {
        this.playCallCount += 1;
        return Promise.reject(new Error("no such file"));
      }
    }
    MockAudio.instances = [];
    vi.stubGlobal("Audio", RejectingAudio);
    const { unlockSounds, playSound } = await import("./sounds");
    unlockSounds();
    expect(() => playSound("correct")).not.toThrow();
  });

  it("respects per-sound volume", async () => {
    const { unlockSounds, playSound } = await freshSounds();
    unlockSounds();
    playSound("correct");
    const audio = MockAudio.instances.find((a) => a.src.includes("bing"));
    expect(audio!.volume).toBeCloseTo(0.2);
  });

  it("suppresses an immediate duplicate call for the same sound", async () => {
    const { unlockSounds, playSound } = await freshSounds();
    unlockSounds();
    const audio = MockAudio.instances.find((a) => a.src.includes("flip-card"))!;
    const before = audio.playCallCount;
    playSound("cardFlip");
    playSound("cardFlip"); // fired an instant later — treated as a duplicate.
    expect(audio.playCallCount).toBe(before + 1);
  });
});

describe("victory looping sound", () => {
  it("does not restart an already-playing victory loop", async () => {
    const { unlockSounds, playSound } = await freshSounds();
    unlockSounds();
    const audio = MockAudio.instances.find((a) =>
      a.src.includes("victory-bella-ciao"),
    )!;

    playSound("victory");
    expect(audio.paused).toBe(false);
    const countAfterFirst = audio.playCallCount;

    playSound("victory"); // already playing — must be a no-op.
    expect(audio.playCallCount).toBe(countAfterFirst);
  });

  it("stopSound stops and rewinds the victory loop", async () => {
    const { unlockSounds, playSound, stopSound } = await freshSounds();
    unlockSounds();
    playSound("victory");
    const audio = MockAudio.instances.find((a) =>
      a.src.includes("victory-bella-ciao"),
    )!;
    audio.currentTime = 12;

    stopSound("victory");
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(0);
  });
});
