/**
 * Catalogue of the "secret" URL parameters the game understands.
 *
 * These aren't discoverable anywhere in the UI — they're opt-in flags you add
 * to a link before sharing it. This file is the single place they're written
 * down, so /admin/links can render them and they stop living only in memory.
 *
 * When you add a new flag to the game, add it here too.
 */

export type SpecialLink = {
  /** The query string appended to the app URL, e.g. `?highElo`. */
  query: string;
  label: string;
  description: string;
  /** Where the flag is read, so the behaviour can be traced from the docs. */
  source: string;
  /** True when the flag needs a value filled in rather than being a bare
   * switch — those can't be rendered as a ready-to-copy link. */
  needsValue?: boolean;
};

export const SPECIAL_LINKS: SpecialLink[] = [
  {
    query: "?highElo",
    label: "High Elo match",
    description:
      "Tags the game as a High Elo match. Shows the pink “High Elo” pill in the header, and the result is filed under the High Elo tab on the data page instead of the normal stats.",
    source: "src/app/page.tsx",
  },
  {
    query: "?bok-special",
    label: "Special card art",
    description:
      "Swaps in the alternate card art. Host needs to include this flag in their room link and all players will see the special BOK SPECIAL art.",
    source: "src/components/game/PlayingCard.tsx",
  },
];

/** Flags are plain switches, so they combine with `&` after the first one:
 * `?highElo&bok-special`. Exposed as a hint on the admin page rather than
 * generating every permutation. */
export const COMBINE_HINT =
  "Flags stack — join them with & after the first one, e.g. ?highElo&bok-special";
