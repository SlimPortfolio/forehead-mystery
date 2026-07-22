export type CardState = "possible" | "impossible" | "most-likely";
export type GamePhase = "lobby" | "ranking" | "guessing" | "confirmation" | "finished";

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

export type Room = {
  id: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  round: number;
  currentTurnIndex: number;
  turnOrder: string[];
};

export const CARD_POOL = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function formatRank(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

/** Which bottom-bar modal (if any) is currently open. */
export type ActiveModal =
  | { type: "rank" }
  | { type: "guess" }
  | { type: "scratchpad" }
  | { type: "menu" }
  | { type: "window"; playerId: string }
  | null;
