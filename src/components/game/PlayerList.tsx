import { GamePhase, Player, Room } from "./types";
import PlayerRow from "./PlayerRow";

type PlayerListProps = {
  room: Room;
  playerId: string | null;
  onOpenWindowView: (playerId: string) => void;
};

function hasActedThisPhase(player: Player, phase: GamePhase) {
  if (phase === "ranking") return player.ranking != null;
  if (phase === "guessing" || phase === "confirmation") {
    return player.isCorrectlyIdentified || player.eliminatedGuesses.length > 0;
  }
  return false;
}

/** Players reordered so the current turn is first, following turn order from there. */
function orderByTurn(room: Room): Player[] {
  const { turnOrder, currentTurnIndex, players } = room;
  if (!turnOrder.length) return players;

  const rotatedIds = [
    ...turnOrder.slice(currentTurnIndex),
    ...turnOrder.slice(0, currentTurnIndex),
  ];
  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered = rotatedIds
    .map((id) => byId.get(id))
    .filter((player): player is Player => Boolean(player));

  const remaining = players.filter((player) => !turnOrder.includes(player.id));
  return [...ordered, ...remaining];
}

export default function PlayerList({ room, playerId, onOpenWindowView }: PlayerListProps) {
  const currentPlayerId = room.turnOrder[room.currentTurnIndex];
  const orderedPlayers = orderByTurn(room);

  return (
    <div className="flex flex-col gap-3">
      {orderedPlayers.map((player) => (
        <PlayerRow
          key={player.id}
          player={player}
          isSelf={player.id === playerId}
          isCurrentTurn={player.id === currentPlayerId}
          hasActedThisPhase={hasActedThisPhase(player, room.phase)}
          phase={room.phase}
          onOpenWindowView={onOpenWindowView}
        />
      ))}
    </div>
  );
}
