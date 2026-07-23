export type CardState = "possible" | "impossible" | "most-likely";
export type GamePhase =
  | "lobby"
  | "ranking"
  | "guessing"
  | "confirmation"
  | "finished";

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  card?: string;
  ranking?: number | null;
  guess?: string | null;
  eliminatedGuesses: string[];
  isCorrectlyIdentified: boolean;
};

export type ChatMessage = {
  text: string;
  ts: number;
};

export type Room = {
  id: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  round: number;
  currentTurnIndex: number;
  turnOrder: string[];
  /** Increments each time a new game is dealt; drives which suit cards display this game. */
  gameNumber?: number;
  /** Latest preset chat message per player, shown as a speech bubble by the sender's row.
   * Keyed by playerId so simultaneous emotes from different players don't clobber each other. */
  chatMessages?: Record<string, ChatMessage>;
};

/** Preset trash-talk lines players can fire off during a game. */
export const EMOTE_OPTIONS = [
  "Can we get much higher!?",
  "I'm in the dirt",
  "Tell me everything",
  "That tells me everything I need to know",
  "That's not possible...",
  "What, HOW!?",
  "You think you're better than me",
  "You think, YOU'RE the highest?",
];

export const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export const CARD_POOL = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/** Players in fixed turn-order sequence — the order they gave clues and
 * guessed — with anyone not in turnOrder appended. Shared by the in-game
 * player list and the results screen so both read the same top-to-bottom. */
export function orderPlayersByTurn(room: Room): Player[] {
  const { turnOrder, players } = room;
  if (!turnOrder.length) return players;

  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered = turnOrder
    .map((id) => byId.get(id))
    .filter((player): player is Player => Boolean(player));

  const remaining = players.filter((player) => !turnOrder.includes(player.id));
  return [...ordered, ...remaining];
}

/** One suit per game, cycling — cosmetic only, does not affect game logic. */
export const SUITS = ["♣", "♥", "♦", "♠"] as const;

export function suitForGame(gameNumber: number | undefined) {
  return SUITS[((gameNumber ?? 1) - 1 + SUITS.length) % SUITS.length];
}

export function formatRank(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

/** Derives the "Correct!/Incorrect! Guessed X" line from persisted fields (not the
 * transient `guess` field, which gets cleared as turns advance) so it survives
 * turn changes and still reads correctly on the final results screen. */
export function getGuessOutcome(
  player: Player,
): { text: string; tone: "success" | "error" } | null {
  if (player.isCorrectlyIdentified) {
    return { text: `Correct! Guessed ${player.card ?? "?"}!`, tone: "success" };
  }
  const lastGuess =
    player.eliminatedGuesses[player.eliminatedGuesses.length - 1];
  if (lastGuess) {
    return { text: `Incorrect! Guessed ${lastGuess}.`, tone: "error" };
  }
  return null;
}

/** Which bottom-bar modal (if any) is currently open. */
export type ActiveModal =
  | { type: "rank" }
  | { type: "guess" }
  | { type: "scratchpad" }
  | { type: "menu" }
  | { type: "window"; playerId: string }
  | { type: "help" }
  | null;
