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
  players: WinnerPlayerCard[];
  createdAt: string;
};
