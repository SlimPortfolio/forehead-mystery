// Client-side dark-mode preference. Mirrors the sound-mute store in
// sounds.ts: a small module-level store backed by localStorage and exposed
// via useSyncExternalStore, so components can read/reflect the preference
// without a setState-in-effect or a hydration mismatch.
//
// The actual light/dark switch happens by toggling a `dark` class on
// <html> (see the `dark:` Tailwind variant registered in globals.css). The
// initial class is set by an inline script in layout.tsx that runs before
// hydration, so there's no light-mode flash on load; setDarkMode keeps it in
// sync for the rest of the session.

const THEME_STORAGE_KEY = "forehead-mystery:theme";

// null until first read; then mirrors the persisted preference.
let darkMode: boolean | null = null;
const themeListeners = new Set<() => void>();

function loadDarkMode(): boolean {
  if (darkMode !== null) return darkMode;
  if (typeof window === "undefined") return false;
  darkMode = window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  return darkMode;
}

/** Persist the dark-mode preference, reflect it on <html>, and notify subscribers. */
export function setDarkMode(value: boolean) {
  darkMode = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, value ? "dark" : "light");
    document.documentElement.classList.toggle("dark", value);
  }
  themeListeners.forEach((listener) => listener());
}

// External-store hooks for `useSyncExternalStore`, so components can read/reflect
// the dark-mode preference without a setState-in-effect or a hydration mismatch.
export function subscribeDarkMode(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

export function getDarkModeSnapshot(): boolean {
  return loadDarkMode();
}

export function getDarkModeServerSnapshot(): boolean {
  return false;
}
