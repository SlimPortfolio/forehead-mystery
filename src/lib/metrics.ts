import { CARD_POOL, Player } from "@/components/game/types";

export type PlayerCard = {
  name: string;
  card: string;
};

export type GameMetricPayload = {
  gameWon: boolean;
  numberOfPlayers: number;
  numberOfCorrectGuess: number;
  percentCorrectGuess: number;
  numberOfCorrectRank: number;
  percentOfCorrectRank: number;
  highEloMatch: boolean;
  /** A game with at least one bot in it. Bots always guess their own card
   * correctly, so these are tracked in their own section and deliberately
   * excluded from the normal and high-Elo stats. */
  botGame: boolean;
  cardCombination: string[];
  /** Logged for later analysis only — never rendered on the /data page. */
  playerCards: PlayerCard[];
};

export type GameMetricRecord = GameMetricPayload & {
  id: string;
  createdAt: string;
};

// ─── Time-range filtering (used by the /data dashboard) ──────────────────────
export type MetricRange = "1D" | "1W" | "1M" | "1Y" | "ALL";

/** Rolling windows counting back from "now" (not calendar buckets), matching
 * the stock-chart mental model and staying timezone-agnostic — it's pure
 * duration math, so there's no UTC-vs-local boundary to get wrong. */
export const METRIC_RANGES: { id: MetricRange; label: string; days: number | null }[] = [
  { id: "1D", label: "1D", days: 1 },
  { id: "1W", label: "1W", days: 7 },
  { id: "1M", label: "1M", days: 30 },
  { id: "1Y", label: "1Y", days: 365 },
  { id: "ALL", label: "All", days: null },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when `createdAt` falls within `range` counting back from `now`. "ALL"
 * (and any unparseable range) always passes; an unparseable date never does. */
export function isWithinRange(
  createdAt: string,
  range: MetricRange,
  now: number = Date.now(),
): boolean {
  const config = METRIC_RANGES.find((r) => r.id === range);
  if (!config || config.days === null) return true;
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return false;
  return ts >= now - config.days * DAY_MS;
}

function cardValue(card: string | undefined): number {
  // CARD_POOL is ordered Ace (low) -> King (high), so its index is the value.
  return card ? CARD_POOL.indexOf(card) : -1;
}

function toPercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100 * 100) / 100;
}

/** Derives the end-of-game metrics from the players who actually took part in
 * the game (mid-game joiners already filtered out by the caller). Pure and
 * client-safe so both the game view and any server code can reuse it. */
export function computeGameMetrics(
  activePlayers: Player[],
  highEloMatch: boolean,
  botGame: boolean,
): GameMetricPayload {
  const numberOfPlayers = activePlayers.length;

  const numberOfCorrectGuess = activePlayers.filter(
    (player) => player.isCorrectlyIdentified,
  ).length;

  // Rank 1 = highest card, so a player's true rank is their position when the
  // group is sorted by card value descending. No duplicate cards in a game, so
  // there are never ties to break.
  const byCardDesc = [...activePlayers].sort(
    (a, b) => cardValue(b.card) - cardValue(a.card),
  );
  const numberOfCorrectRank = byCardDesc.filter(
    (player, index) => player.ranking === index + 1,
  ).length;

  const cardCombination = activePlayers
    .map((player) => player.card)
    .filter((card): card is string => Boolean(card))
    .sort((a, b) => cardValue(a) - cardValue(b));

  const playerCards: PlayerCard[] = activePlayers.map((player) => ({
    name: player.name,
    card: player.card ?? "",
  }));

  return {
    gameWon: numberOfPlayers > 0 && numberOfCorrectGuess === numberOfPlayers,
    numberOfPlayers,
    numberOfCorrectGuess,
    percentCorrectGuess: toPercent(numberOfCorrectGuess, numberOfPlayers),
    numberOfCorrectRank,
    percentOfCorrectRank: toPercent(numberOfCorrectRank, numberOfPlayers),
    highEloMatch,
    botGame,
    cardCombination,
    playerCards,
  };
}
