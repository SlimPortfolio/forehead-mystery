import { GamePhase, Player, Room, suitForGame } from "./types";
import PlayerRow from "./PlayerRow";

type PlayerListProps = {
  room: Room;
  playerId: string | null;
  activeChatBubbles: Record<string, string>;
  onOpenWindowView: (playerId: string) => void;
};

function hasActedThisPhase(player: Player, phase: GamePhase) {
  if (phase === "ranking") return player.ranking != null;
  if (phase === "guessing" || phase === "confirmation") {
    return player.isCorrectlyIdentified || player.eliminatedGuesses.length > 0;
  }
  return false;
}

/** Players in fixed turn-order sequence (whoever goes last stays listed last). */
function orderByTurn(room: Room): Player[] {
  const { turnOrder, players } = room;
  if (!turnOrder.length) return players;

  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered = turnOrder
    .map((id) => byId.get(id))
    .filter((player): player is Player => Boolean(player));

  const remaining = players.filter((player) => !turnOrder.includes(player.id));
  return [...ordered, ...remaining];
}

export default function PlayerList({
  room,
  playerId,
  activeChatBubbles,
  onOpenWindowView,
}: PlayerListProps) {
  const currentPlayerId = room.turnOrder[room.currentTurnIndex];
  const orderedPlayers = orderByTurn(room);
  const suit = suitForGame(room.gameNumber);

  return (
    <div className="flex flex-col gap-2">
      {orderedPlayers.map((player) => (
        <PlayerRow
          key={player.id}
          player={player}
          isSelf={player.id === playerId}
          isCurrentTurn={player.id === currentPlayerId}
          hasActedThisPhase={hasActedThisPhase(player, room.phase)}
          phase={room.phase}
          suit={suit}
          chatText={activeChatBubbles[player.id]}
          onOpenWindowView={onOpenWindowView}
        />
      ))}
    </div>
  );
}
