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
  cardCombination: string[];
  /** Logged for later analysis only — never rendered on the /data page. */
  playerCards: PlayerCard[];
};

export type GameMetricRecord = GameMetricPayload & {
  id: string;
  createdAt: string;
};

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
    cardCombination,
    playerCards,
  };
}
