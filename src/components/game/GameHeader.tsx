import { GamePhase } from "./types";
import GameMenu from "./GameMenu";

type GameHeaderProps = {
  roomCode: string;
  round: number;
  phase: GamePhase;
  isHost: boolean;
  shareUrl: string;
  onStartNextGame: () => void;
  onEndGame: () => void;
  onRemovePlayer: () => void;
  onLeaveGame: () => void;
};

const PHASE_LABEL: Record<GamePhase, string> = {
  lobby: "Lobby",
  ranking: "Ranking Phase",
  guessing: "Guessing Phase",
  confirmation: "Guessing Phase",
  finished: "Game Complete",
};

export default function GameHeader({
  roomCode,
  round,
  phase,
  isHost,
  shareUrl,
  onStartNextGame,
  onEndGame,
  onRemovePlayer,
  onLeaveGame,
}: GameHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Room {roomCode} &middot; Round {round}
        </p>
        <h2 className="text-2xl font-bold text-ink">{PHASE_LABEL[phase]}</h2>
      </div>
      <GameMenu
        isHost={isHost}
        shareUrl={shareUrl}
        onStartNextGame={onStartNextGame}
        onEndGame={onEndGame}
        onRemovePlayer={onRemovePlayer}
        onLeaveGame={onLeaveGame}
      />
    </div>
  );
}
