/**
 * Profanity filter for free-text room chat (lobby + postgame).
 *
 * Used on both sides of the wire: the chat box blocks a message before it is
 * sent so the player gets immediate feedback, and /api/rooms/[roomCode]
 * re-checks the same way so a hand-rolled PATCH can't slip one through.
 *
 * Matching is deliberately boundary-anchored rather than plain substring so
 * innocent words that contain a bad word ("Scunthorpe", "assassin", "class",
 * "shiitake") are not flagged. Evasion is handled by normalizing the text
 * first (leetspeak, accents) and by tolerating separators *between* the
 * letters of a blocked word, so "f.u.c.k", "f u c k" and "sh1t" are caught.
 */

/**
 * Blocked words, lowercase and un-punctuated. Common inflections (-s, -ing,
 * -er, …) are matched automatically, so only list a variant when its stem
 * differs (e.g. "shitty" is not "shit" + a known suffix).
 *
 * Mild words (damn, hell, crap) are intentionally left out — this blocks
 * strong profanity and slurs. Add to this list to tighten it.
 */
const BLOCKED_WORDS = [
  // Strong profanity
  "anal",
  "anus",
  "arse",
  "arsehole",
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "blowjob",
  "bollocks",
  "boner",
  "bullshit",
  "clit",
  "cock",
  "cocksucker",
  "cum",
  "cunt",
  "dick",
  "dickhead",
  "dildo",
  "dipshit",
  "douchebag",
  "fuck",
  "fucker",
  "fuk",
  "handjob",
  "horseshit",
  "jackass",
  "jerkoff",
  "jizz",
  "motherfucker",
  "nutsack",
  "piss",
  "prick",
  "pussy",
  "shit",
  "shithead",
  "shitty",
  "slut",
  "twat",
  "wank",
  "wanker",
  "whore",

  // Slurs
  "beaner",
  "chink",
  "coon",
  "dyke",
  "fag",
  "faggot",
  "gook",
  "kike",
  "nigga",
  "nigger",
  "paki",
  "raghead",
  "retard",
  "retarded",
  "spic",
  "tranny",
  "wetback",
];

/**
 * Words safe to also match *inside* a run of letters, which catches
 * concatenated evasion like "shitfuck" or "youfuckinglose". Only words that
 * effectively never appear inside an innocent English word belong here —
 * "ass", "cunt" and "shit" must NOT, or "class"/"Scunthorpe"/"shiitake" break.
 */
const SUBSTRING_WORDS = new Set([
  "fuck",
  "fuk",
  "motherfucker",
  "faggot",
  "nigger",
  "nigga",
  "cocksucker",
]);

/** Inflections appended to a blocked stem, e.g. "fuck" -> "fucking". */
const SUFFIX = "(?:s|es|ed|er|ers|ing|in|y|ies|z|zes)?";

/** Up to 3 non-letters may sit between letters: "f.u.c.k", "s h i t". */
const SEPARATOR = "[^a-z]{0,3}";

/**
 * Fold the text into plain lowercase letters + punctuation: strip accents and
 * map the usual leetspeak stand-ins onto the letters they impersonate.
 */
function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/8/g, "b")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/9/g, "g");
}

/**
 * "fuck" -> /\bf+[^a-z]{0,3}u+[^a-z]{0,3}c+[^a-z]{0,3}k+(?:s|es|…)?\b/
 *
 * Each letter takes a `+` so stretched spellings ("fuuuck", "shittt") match,
 * and the leading/trailing \b keeps the match to a whole word.
 */
function buildWordPattern(word: string): RegExp {
  const body = word.split("").join(`+${SEPARATOR}`) + "+";
  return new RegExp(`\\b${body}${SUFFIX}\\b`, "i");
}

const WORD_PATTERNS = BLOCKED_WORDS.map(buildWordPattern);

const SUBSTRING_PATTERNS = [...SUBSTRING_WORDS].map(
  (word) => new RegExp(word.split("").join("+") + "+", "i"),
);

/** Letters only — used for the concatenated-evasion pass. */
function squash(text: string): string {
  return text.replace(/[^a-z]/g, "");
}

/** True when the message contains a blocked word. */
export function containsProfanity(text: string): boolean {
  if (!text) return false;

  const normalized = normalize(text);
  if (WORD_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  const squashed = squash(normalized);
  return SUBSTRING_PATTERNS.some((pattern) => pattern.test(squashed));
}

/** Shown to the player when their message is rejected. */
export const PROFANITY_REJECTION =
  "Keep it clean — that message contains language that isn't allowed.";
