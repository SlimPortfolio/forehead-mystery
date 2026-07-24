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
  createdAt: string;
};
