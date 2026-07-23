import { GamePhase } from "./types";

type GameHeaderProps = {
  round: number;
  phase: GamePhase;
  onOpenMenu: () => void;
};

const PHASE_LABEL: Record<GamePhase, string> = {
  lobby: "Lobby",
  ranking: "Ranking Phase",
  guessing: "Guessing Phase",
  confirmation: "Guessing Phase",
  finished: "Game Complete",
};

export default function GameHeader({ round, phase, onOpenMenu }: GameHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Round {round}
        </p>
        <h2 className="text-2xl font-bold text-ink">{PHASE_LABEL[phase]}</h2>
      </div>
      <button
        onClick={onOpenMenu}
        aria-label="Menu"
        className="rounded-full px-2 py-1 text-2xl leading-none text-slate-500"
      >
        &#8942;
      </button>
    </div>
  );
}
