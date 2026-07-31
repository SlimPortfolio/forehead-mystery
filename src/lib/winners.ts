export type WinnerPlayerCard = {
  name: string;
  card: string;
};

export type WinnerRecord = {
  id: string;
  teamName: string;
  date: string;
  time: string;
  location: string;
  lat: number | null;
  lng: number | null;
  players: WinnerPlayerCard[];
  /** Suit symbol the game was played with (one suit per game, e.g. "♥").
   * Optional so legacy records without it still parse. */
  suit?: string;
  /** True when the game was played with the ?bok-special deck, so the map
   * popup renders the special card art. Optional for legacy records. */
  special?: boolean;
  createdAt: string;
};
