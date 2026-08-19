import { GamePhase, orderPlayersByTurn, Player, Room, suitForGame } from "./types";
import PlayerRow from "./PlayerRow";

type PlayerListProps = {
  room: Room;
  playerId: string | null;
  activeChatBubbles: Record<string, string>;
  /** Deal-in reveal progress: the number of cards (in turn order) that have
   * flipped face-up so far. `null` means no reveal is running, so every card
   * shows face-up normally. */
  cardRevealCount: number | null;
  /** Seconds the current-turn player has gone without any detected activity,
   * once past the away-indicator threshold; null hides the indicator. Only
   * ever applied to the current-turn player's own row below. */
  turnAwaySeconds: number | null;
  onOpenLookingGlass: (playerId: string) => void;
};

function hasActedThisPhase(player: Player, phase: GamePhase) {
  if (phase === "ranking") return player.ranking != null;
  if (phase === "guessing" || phase === "confirmation") {
    return player.isCorrectlyIdentified || player.eliminatedGuesses.length > 0;
  }
  return false;
}

export default function PlayerList({
  room,
  playerId,
  activeChatBubbles,
  cardRevealCount,
  turnAwaySeconds,
  onOpenLookingGlass,
}: PlayerListProps) {
  const currentPlayerId = room.turnOrder[room.currentTurnIndex];
  // A player who left/was kicked mid-game (`departed`) is stripped from
  // turnOrder but kept in `room.players` for the postgame debrief — filter
  // them back out here so they don't show up as a stale live row (kicking
  // doesn't always end the game; see handleKickPlayer's isActiveTurnPhase
  // logic). FinishedScreen deliberately does NOT filter them out.
  const orderedPlayers = orderPlayersByTurn(room).filter(
    (player) => !player.departed,
  );
  const suit = suitForGame(room.gameNumber);
  // Host-synced special deck (see Room.bokSpecial). Passed explicitly so every
  // player's cards match the host's setting, not their own ?bok-special URL.
  const special = Boolean(room.bokSpecial);

  return (
    <div className="flex flex-col gap-2">
      {orderedPlayers.map((player, index) => (
        <PlayerRow
          key={player.id}
          player={player}
          isSelf={player.id === playerId}
          isCurrentTurn={player.id === currentPlayerId}
          hasActedThisPhase={hasActedThisPhase(player, room.phase)}
          phase={room.phase}
          suit={suit}
          special={special}
          chatText={activeChatBubbles[player.id]}
          faceDown={cardRevealCount !== null && index >= cardRevealCount}
          awaySeconds={player.id === currentPlayerId ? turnAwaySeconds : null}
          onOpenLookingGlass={onOpenLookingGlass}
        />
      ))}
    </div>
  );
}
