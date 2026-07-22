"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActiveModal,
  CARD_POOL,
  CardState,
  GamePhase,
  Player,
  Room,
  suitForGame,
} from "@/components/game/types";
import JoinScreen from "@/components/game/JoinScreen";
import LobbyScreen from "@/components/game/LobbyScreen";
import FinishedScreen from "@/components/game/FinishedScreen";
import GameHeader from "@/components/game/GameHeader";
import PlayerList from "@/components/game/PlayerList";
import ActionBar from "@/components/game/ActionBar";
import RankSelectModal from "@/components/game/RankSelectModal";
import GuessCardModal from "@/components/game/GuessCardModal";
import ScratchpadModal from "@/components/game/ScratchpadModal";
import WindowViewModal from "@/components/game/WindowViewModal";
import MenuModal from "@/components/game/MenuModal";
import CorrectGuessPopup from "@/components/game/CorrectGuessPopup";
import TransitionOverlay from "@/components/game/TransitionOverlay";

const POLL_INTERVAL_MS = 2000;
const NEW_GAME_TRANSITION_MS = 900;
const STORAGE_PREFIX = "forehead-mystery-room";
const PLAYER_ID_KEY = "forehead-mystery-player-id";
const isLocal = typeof window !== "undefined" && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.")
);

const appUrl = (
  (process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000")) as string
).replace(/\/$/, "");

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createRoom(
  roomCode: string,
  hostPlayerId: string,
  hostName: string,
): Room {
  return {
    id: roomCode,
    hostId: hostPlayerId,
    players: [
      {
        id: hostPlayerId,
        name: hostName,
        isHost: true,
        isReady: true,
        eliminatedGuesses: [],
        isCorrectlyIdentified: false,
      },
    ],
    phase: "lobby",
    round: 1,
    currentTurnIndex: 0,
    turnOrder: [hostPlayerId],
    gameNumber: 1,
  };
}

function getCardValue(card: string): number {
  const values: Record<string, number> = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
  };
  return values[card] || 0;
}

function getTestPlayerRanking(testPlayer: Player, allPlayers: Player[]): number {
  if (!testPlayer.card) return 1;

  const testPlayerCardVal = getCardValue(testPlayer.card);
  const otherPlayers = allPlayers.filter((p) => p.id !== testPlayer.id);
  const otherCards = otherPlayers
    .map((p) => p.card)
    .filter((c): c is string => !!c)
    .sort((a, b) => getCardValue(a) - getCardValue(b));

  const cardsAbove = otherCards.filter(
    (card) => getCardValue(card) > testPlayerCardVal,
  ).length;

  return cardsAbove + 1;
}

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState(
    "Create or join a room to start playing.",
  );
  const [pendingGuess, setPendingGuess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [scratchpad, setScratchpad] = useState<Record<string, CardState>>({});
  const [lastGuessResult, setLastGuessResult] = useState<{
    wasCorrect: boolean;
    card: string;
    playerName: string;
  } | null>(null);
  const [winnerForm, setWinnerForm] = useState({
    teamName: "",
    date: "",
    time: "",
    city: "",
    state: "",
  });
  const [winnerSaveStatus, setWinnerSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [binkPlayerName, setBinkPlayerName] = useState<string | null>(null);
  const [binkClosing, setBinkClosing] = useState(false);
  const [activeChatBubble, setActiveChatBubble] = useState<{
    playerId: string;
    text: string;
  } | null>(null);
  const previousPhaseRef = useRef<GamePhase | null>(null);
  const roomRef = useRef<Room | null>(null);
  const suppressPollUntilRef = useRef<number>(0);
  const winnerFormInitializedRef = useRef(false);
  const binkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const binkCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChatTsRef = useRef<number>(0);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPlayerId = window.localStorage.getItem(PLAYER_ID_KEY);
    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    } else {
      const nextId = createId("player");
      window.localStorage.setItem(PLAYER_ID_KEY, nextId);
      setPlayerId(nextId);
    }

    const params = new URLSearchParams(window.location.search);
    const queryRoom = params.get("room");
    if (queryRoom) {
      setRoomCode(queryRoom.toUpperCase());
    }
  }, []);

  // Clear scratchpad whenever we detect a genuine transition into a fresh
  // game (round 1, turn 0), rather than relying on those primitive values
  // happening to differ from whatever they were before.
  useEffect(() => {
    if (!room) return;

    const previousPhase = previousPhaseRef.current;
    const isFreshGameStart =
      room.phase === "ranking" &&
      room.round === 1 &&
      room.currentTurnIndex === 0 &&
      previousPhase !== "ranking";

    if (isFreshGameStart) {
      setScratchpad({});
      if (typeof window !== "undefined" && playerId) {
        window.localStorage.removeItem(
          `${STORAGE_PREFIX}:${room.id}:${playerId}`,
        );
      }
      winnerFormInitializedRef.current = false;
      setWinnerSaveStatus("idle");
      setWinnerForm({ teamName: "", date: "", time: "", city: "", state: "" });
    }

    previousPhaseRef.current = room.phase;
  }, [room?.id, room?.phase, room?.round, room?.currentTurnIndex, playerId]);

  // Default the winner-form date/time to "now" the moment a game finishes.
  useEffect(() => {
    if (!room || room.phase !== "finished" || winnerFormInitializedRef.current)
      return;

    const now = new Date();
    setWinnerForm((current) => ({
      ...current,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
    }));
    winnerFormInitializedRef.current = true;
  }, [room?.phase]);

  // Show the "BINKED IT" popup for its own duration, decoupled from the
  // confirmation phase's turn-advance timer so it doesn't get cut short.
  // Deliberately not cleaned up via the effect's own return — that cleanup
  // would fire (and cancel the pending clear) the moment the confirmation
  // phase resets lastGuessResult to null ~2s later, leaving the popup stuck
  // on screen indefinitely instead of clearing itself.
  useEffect(() => {
    if (!lastGuessResult?.wasCorrect) return;

    setBinkPlayerName(lastGuessResult.playerName);
    setBinkClosing(false);
    if (binkTimeoutRef.current) clearTimeout(binkTimeoutRef.current);
    if (binkCloseTimeoutRef.current) clearTimeout(binkCloseTimeoutRef.current);

    binkTimeoutRef.current = setTimeout(() => setBinkClosing(true), 1200);
    binkCloseTimeoutRef.current = setTimeout(() => {
      setBinkPlayerName(null);
      setBinkClosing(false);
    }, 1500);
  }, [lastGuessResult]);

  useEffect(() => {
    return () => {
      if (binkCloseTimeoutRef.current) clearTimeout(binkCloseTimeoutRef.current);
      if (binkTimeoutRef.current) clearTimeout(binkTimeoutRef.current);
    };
  }, []);

  // Show a chat speech bubble for its own duration. Same ref-timer pattern
  // as the bink popup (not effect-cleanup-driven) so an unrelated room
  // update can't cancel the pending clear and leave the bubble stuck.
  useEffect(() => {
    const message = room?.chatMessage;
    if (!message || message.ts === lastChatTsRef.current) return;

    lastChatTsRef.current = message.ts;
    setActiveChatBubble({ playerId: message.playerId, text: message.text });
    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
    chatTimeoutRef.current = setTimeout(() => setActiveChatBubble(null), 4000);
  }, [room?.chatMessage]);

  useEffect(() => {
    return () => {
      if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
    };
  }, []);

  // Poll for room updates. Paused while the tab is hidden/backgrounded to
  // avoid burning API requests when nobody is looking at the page.
  useEffect(() => {
    if (!roomCode || !joined) return;

    const pollRoom = async () => {
      try {
        const response = await fetch(
          `${appUrl}/api/rooms?roomCode=${roomCode}`,
        );
        if (response.ok) {
          if (Date.now() < suppressPollUntilRef.current) {
            // We just submitted our own optimistic update; skip this poll
            // so a response fetched before our PATCH landed can't revert it.
            return;
          }

          const data = await response.json();
          const fetchedRoom = data.room as Room | null;
          const currentRoom = roomRef.current;
          if (fetchedRoom && currentRoom) {
            // Deep comparison to detect changes
            if (
              fetchedRoom.phase !== currentRoom.phase ||
              fetchedRoom.round !== currentRoom.round ||
              fetchedRoom.currentTurnIndex !== currentRoom.currentTurnIndex ||
              fetchedRoom.players.length !== currentRoom.players.length ||
              fetchedRoom.turnOrder.join(",") !== currentRoom.turnOrder.join(",") ||
              fetchedRoom.chatMessage?.ts !== currentRoom.chatMessage?.ts ||
              JSON.stringify(fetchedRoom.players) !== JSON.stringify(currentRoom.players)
            ) {
              setRoom(fetchedRoom);
            }
          }
        }
      } catch (error) {
        console.error("Failed to poll room state:", error);
      }
    };

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollInterval) return;
      pollRoom();
      pollInterval = setInterval(pollRoom, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (!pollInterval) return;
      clearInterval(pollInterval);
      pollInterval = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") {
      startPolling();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopPolling();
    };
  }, [roomCode, joined, appUrl]);

  useEffect(() => {
    if (!room || typeof window === "undefined") return;
    window.localStorage.setItem(
      `${STORAGE_PREFIX}:${room.id}`,
      JSON.stringify(room),
    );
  }, [room]);

  useEffect(() => {
    if (!room || !playerId || typeof window === "undefined") return;
    const storedScratchpad = window.localStorage.getItem(
      `${STORAGE_PREFIX}:${room.id}:${playerId}`,
    );
    if (storedScratchpad) {
      try {
        setScratchpad(
          JSON.parse(storedScratchpad) as Record<string, CardState>,
        );
      } catch {
        window.localStorage.removeItem(
          `${STORAGE_PREFIX}:${room.id}:${playerId}`,
        );
      }
    }
  }, [room?.id, playerId]);

  useEffect(() => {
    if (!room || !playerId || typeof window === "undefined") return;
    window.localStorage.setItem(
      `${STORAGE_PREFIX}:${room.id}:${playerId}`,
      JSON.stringify(scratchpad),
    );
  }, [room, playerId, scratchpad]);

  useEffect(() => {
    if (!room || !playerId || room.phase !== "ranking") return;

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    const currentPlayerInTurn = room.players.find(
      (p) => p.id === currentPlayerId,
    );

    if (
      !currentPlayerInTurn ||
      !currentPlayerInTurn.name.startsWith("Test Player") ||
      currentPlayerInTurn.ranking
    )
      return;

    const timer = setTimeout(() => {
      const testRank = getTestPlayerRanking(
        currentPlayerInTurn,
        room.players,
      );
      const nextPlayers = room.players.map((p) =>
        p.id === currentPlayerId ? { ...p, ranking: testRank } : p,
      );

      const nextTurnIndex = room.currentTurnIndex + 1;
      const allRanked = nextTurnIndex >= room.turnOrder.length;

      const nextRoom: Room = {
        ...room,
        players: nextPlayers,
        phase: allRanked ? "guessing" : "ranking",
        currentTurnIndex: allRanked ? 0 : nextTurnIndex,
        round: allRanked ? 2 : room.round,
      };

      submitRoomState(nextRoom);
    }, 500);

    return () => clearTimeout(timer);
  }, [room, playerId]);

  useEffect(() => {
    if (!room || !playerId || room.phase !== "guessing") return;

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    const currentPlayerInTurn = room.players.find(
      (p) => p.id === currentPlayerId,
    );

    if (
      !currentPlayerInTurn ||
      !currentPlayerInTurn.name.startsWith("Test Player")
    )
      return;

    const timer = setTimeout(() => {
      const testGuess = currentPlayerInTurn.card || "A";
      const wasCorrect = testGuess === currentPlayerInTurn.card;

      const nextPlayers = room.players.map((p) =>
        p.id === currentPlayerId
          ? {
              ...p,
              guess: testGuess,
              isCorrectlyIdentified:
                wasCorrect || p.isCorrectlyIdentified,
            }
          : p,
      );

      const nextRoom: Room = {
        ...room,
        players: nextPlayers,
        phase: "confirmation",
      };

      setLastGuessResult({
        wasCorrect,
        card: testGuess,
        playerName: currentPlayerInTurn.name,
      });

      submitRoomState(nextRoom);
    }, 500);

    return () => clearTimeout(timer);
  }, [room, playerId]);

  useEffect(() => {
    if (!room || !playerId || room.phase !== "confirmation") return;

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    const currentPlayerInTurn = room.players.find(
      (p) => p.id === currentPlayerId,
    );

    if (!currentPlayerInTurn) return;

    const timer = setTimeout(() => {
      const nextTurnIndex = room.currentTurnIndex + 1;

      const nextRoom: Room = {
        ...room,
      };

      if (nextTurnIndex >= room.turnOrder.length) {
        // Everyone has guessed - Round 2 (guessing) is complete, game ends
        nextRoom.phase = "finished";
      } else {
        // Next player's turn
        nextRoom.phase = "guessing";
        nextRoom.currentTurnIndex = nextTurnIndex;
        nextRoom.players = room.players.map((player) => ({
          ...player,
          guess: null,
        }));
      }

      setLastGuessResult(null);
      submitRoomState(nextRoom);
    }, 2000);

    return () => clearTimeout(timer);
  }, [room, playerId]);

  const currentPlayer = useMemo(() => {
    if (!room) return null;
    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    return room.players.find((player) => player.id === currentPlayerId) ?? null;
  }, [room]);

  const isMyTurn = Boolean(
    room && currentPlayer && playerId && currentPlayer.id === playerId,
  );
  const myPlayer = useMemo(
    () => room?.players.find((player) => player.id === playerId) ?? null,
    [room, playerId],
  );

  const allCorrectlyIdentified = Boolean(
    room &&
      room.phase === "finished" &&
      room.players.length > 0 &&
      room.players.every((player) => player.isCorrectlyIdentified),
  );

  const submitWinner = async () => {
    if (!room) return;
    if (
      !winnerForm.teamName.trim() ||
      !winnerForm.date ||
      !winnerForm.time ||
      !winnerForm.city.trim() ||
      !winnerForm.state
    ) {
      setStatus("Please fill in team name, city, and state.");
      return;
    }

    setWinnerSaveStatus("saving");
    try {
      const response = await fetch(`${appUrl}/api/winners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: winnerForm.teamName.trim(),
          date: winnerForm.date,
          time: winnerForm.time,
          location: `${winnerForm.city.trim()}, ${winnerForm.state}`,
          players: room.players.map((player) => ({
            name: player.name,
            card: player.card ?? "",
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to save winner");
      setWinnerSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save winner", error);
      setWinnerSaveStatus("error");
    }
  };

  const submitRoomState = (nextRoom: Room) => {
    setRoom(nextRoom);
    // Ignore poll responses for a moment after our own optimistic update,
    // so a slightly-lagging GET (fetched before our PATCH lands on the
    // server) can't clobber the state we just set locally.
    suppressPollUntilRef.current = Date.now() + 1500;

    fetch(`${appUrl}/api/rooms/${nextRoom.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextRoom),
    }).catch(() => undefined);
  };

  const joinOrCreateRoom = async (code: string, createNew = false) => {
    if (!playerId || !playerName.trim()) {
      setStatus("Please enter your name before joining a room.");
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,6}$/.test(normalizedCode)) {
      setStatus("Use 3-6 letters or numbers for your room code.");
      return;
    }

    setIsJoining(true);
    setStatus(`Connecting to room ${normalizedCode}...`);

    try {
      const response = await fetch(
        `${appUrl}/api/rooms?roomCode=${normalizedCode}`,
      );
      const rawText = await response.text();
      let data: Record<string, unknown> = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { raw: rawText };
      }

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Room service returned ${response.status}`,
        );
      }

      const existingRoom = data.room as Room | null;
      const alreadyJoined = existingRoom?.players.some(
        (player) => player.id === playerId,
      );
      const nextPlayers =
        existingRoom && !alreadyJoined
          ? [
              ...existingRoom.players,
              {
                id: playerId,
                name: playerName.trim(),
                isHost: false,
                isReady: true,
                eliminatedGuesses: [],
                isCorrectlyIdentified: false,
              },
            ]
          : (existingRoom?.players ?? []);

      const nextRoom =
        existingRoom && !createNew
          ? {
              ...existingRoom,
              players: nextPlayers,
              turnOrder: existingRoom.turnOrder.length
                ? existingRoom.turnOrder
                : nextPlayers.map((player) => player.id),
            }
          : createRoom(normalizedCode, playerId, playerName.trim());

      setRoomCode(normalizedCode);
      setJoined(true);
      submitRoomState(nextRoom);
      setStatus(`Joined room ${normalizedCode}`);
    } catch (error) {
      console.error("Room create/join failed", {
        roomCode: normalizedCode,
        createNew,
        playerId,
        appUrl,
        isLocal,
        error,
      });

      let errorMessage = "Unable to reach the room service.";
      if (error instanceof Error) {
        errorMessage = `Room failed: ${error.message}`;
      }

      if (isLocal) {
        errorMessage += " (Local: Make sure your dev server is running on port 3000)";
      }

      setStatus(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const startNextGame = () => {
    if (!room || !myPlayer) return;

    // Rotate the turn order so whoever went second last game goes first now
    const [previousFirstPlayer, ...restOfOrder] = room.turnOrder;
    const rotatedTurnOrder = [...restOfOrder, previousFirstPlayer];

    // Deal new cards
    const shuffledCards = shuffle(CARD_POOL).slice(0, room.players.length);
    const nextPlayers = room.players.map((player, index) => ({
      ...player,
      card: shuffledCards[index],
      ranking: null,
      guess: null,
      eliminatedGuesses: [],
      isCorrectlyIdentified: false,
    }));

    const nextRoom: Room = {
      ...room,
      players: nextPlayers,
      phase: "ranking",
      round: 1,
      currentTurnIndex: 0,
      turnOrder: rotatedTurnOrder,
      gameNumber: (room.gameNumber ?? 1) + 1,
    };

    // Clear the scratchpad
    setScratchpad({});
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(
        `${STORAGE_PREFIX}:${room.id}:${playerId}`,
      );
    }

    setIsTransitioning(true);
    submitRoomState(nextRoom);
    setStatus("New game started! Begin with the ranking phase.");
    setTimeout(() => setIsTransitioning(false), NEW_GAME_TRANSITION_MS);
  };

  const startGame = (useTestPlayers = false, skipMinPlayers = false) => {
    if (!room || !myPlayer || !room.players.length) return;
    if (room.hostId !== playerId) {
      setStatus("Only the host can begin the game.");
      return;
    }

    let playersToUse = room.players;
    if (useTestPlayers) {
      const numTestPlayers = 4 - room.players.length;
      const testPlayers: Player[] = Array.from(
        { length: Math.max(0, numTestPlayers) },
        (_, i) => ({
          id: createId("test-player"),
          name: `Test Player ${i + 1}`,
          isHost: false,
          isReady: true,
          eliminatedGuesses: [],
          isCorrectlyIdentified: false,
        }),
      );
      playersToUse = [...room.players, ...testPlayers];
    }

    const minPlayers = skipMinPlayers ? 2 : 4;
    if (playersToUse.length < minPlayers || playersToUse.length > 8) {
      setStatus(
        skipMinPlayers
          ? "A game needs at least 2 players to begin."
          : "A game needs between 4 and 8 players to begin.",
      );
      return;
    }

    const shuffledCards = shuffle(CARD_POOL).slice(0, playersToUse.length);
    const nextPlayers = playersToUse.map((player, index) => ({
      ...player,
      card: shuffledCards[index],
      ranking: null,
      guess: null,
      eliminatedGuesses: [],
      isCorrectlyIdentified: false,
    }));

    const nextRoom: Room = {
      ...room,
      players: nextPlayers,
      phase: "ranking",
      round: 1,
      currentTurnIndex: 0,
      turnOrder: nextPlayers.map((player) => player.id),
    };

    setIsTransitioning(true);
    submitRoomState(nextRoom);
    setStatus("The game has started. Submit your ranking.");
    setTimeout(() => setIsTransitioning(false), NEW_GAME_TRANSITION_MS);
  };

  const submitRanking = (rank: number) => {
    if (!room || !myPlayer || !isMyTurn) return;

    let nextPlayers = room.players.map((player) =>
      player.id === myPlayer.id ? { ...player, ranking: rank } : player,
    );

    let nextTurnIndex = room.currentTurnIndex + 1;
    let nextPhase: GamePhase = nextTurnIndex >= room.turnOrder.length ? "guessing" : "ranking";

    // Auto-submit rankings for test players
    while (
      nextPhase === "ranking" &&
      nextTurnIndex < room.turnOrder.length
    ) {
      const nextPlayerId = room.turnOrder[nextTurnIndex];
      const nextPlayer = nextPlayers.find((p) => p.id === nextPlayerId);

      if (nextPlayer?.name.startsWith("Test Player")) {
        const testRank = getTestPlayerRanking(nextPlayer, nextPlayers);
        nextPlayers = nextPlayers.map((p) =>
          p.id === nextPlayerId ? { ...p, ranking: testRank } : p,
        );
        nextTurnIndex += 1;
        if (nextTurnIndex >= room.turnOrder.length) {
          nextPhase = "guessing";
        }
      } else {
        break;
      }
    }

    const nextRoom: Room = {
      ...room,
      players: nextPlayers,
      currentTurnIndex:
        nextPhase === "guessing" ? 0 : nextTurnIndex,
      phase: nextPhase,
      round: nextPhase === "guessing" ? 2 : room.round,
    };

    submitRoomState(nextRoom);
    setPendingGuess(null);
    setActiveModal(null);
    setStatus(
      nextPhase === "guessing"
        ? `All players ranked! Starting guessing phase.`
        : `You ranked rank ${rank}. Waiting for others to rank.`,
    );
  };

  const selectGuessCard = (card: string) => {
    setPendingGuess(card);
  };

  const submitGuess = () => {
    if (!room || !myPlayer || !isMyTurn || room.phase !== "guessing" || !pendingGuess) return;

    const wasCorrect = myPlayer.card === pendingGuess;
    const nextEliminated = wasCorrect
      ? myPlayer.eliminatedGuesses
      : [...myPlayer.eliminatedGuesses, pendingGuess];

    const nextPlayers = room.players.map((player) => {
      if (player.id !== myPlayer.id) return player;
      return {
        ...player,
        guess: pendingGuess,
        eliminatedGuesses: nextEliminated,
        isCorrectlyIdentified: wasCorrect || player.isCorrectlyIdentified,
      };
    });

    const nextRoom: Room = {
      ...room,
      players: nextPlayers,
      phase: "confirmation",
    };

    setLastGuessResult({
      wasCorrect,
      card: pendingGuess,
      playerName: myPlayer.name,
    });

    submitRoomState(nextRoom);
    setPendingGuess(null);
    setActiveModal(null);
  };

  const toggleScratchpad = (card: string) => {
    setScratchpad((current) => {
      const currentState: CardState = current[card] ?? "possible";
      const nextState: CardState =
        currentState === "possible"
          ? "impossible"
          : currentState === "impossible"
            ? "most-likely"
            : "possible";
      return { ...current, [card]: nextState };
    });
  };

  const clearScratchpad = () => setScratchpad({});

  const handleLeaveGame = () => {
    if (!room) return;
    submitRoomState({ ...room, phase: "finished" });
    setActiveModal(null);
    setJoined(false);
    setStatus("You left the game.");
  };

  const handleEndGame = () => {
    if (!room) return;
    submitRoomState({ ...room, phase: "finished" });
    setStatus("Game ended by host.");
  };

  const handleSendChat = (text: string) => {
    if (!room || !playerId) return;
    submitRoomState({
      ...room,
      chatMessage: { playerId, text, ts: Date.now() },
    });
    setActiveModal(null);
  };

  const guessingCards = useMemo(() => {
    if (!room || !myPlayer) return [] as string[];
    const otherPlayersCards = room.players
      .filter((p) => p.id !== myPlayer.id)
      .flatMap((p) => (p.card ? [p.card] : []));
    return CARD_POOL.filter(
      (card) =>
        !otherPlayersCards.includes(card) &&
        !myPlayer.eliminatedGuesses.includes(card),
    );
  }, [room, myPlayer]);

  const windowViewTarget =
    activeModal?.type === "window"
      ? (room?.players.find((p) => p.id === activeModal.playerId) ?? null)
      : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,#fdf2f8_45%,#fef3c7)] px-4 py-6 pb-28 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">
                Forehead Mystery
              </p>
              <h1 className="text-lg font-semibold">Room {roomCode || "—"}</h1>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-600">{status}</p>
              {joined && room && room.hostId === playerId && room.phase !== "lobby" && (
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={startNextGame}
                    aria-label="Start new game"
                    title="Start new game"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path
                        d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0 0 14.5 3M19.5 9A8 8 0 0 0 5 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleEndGame}
                    aria-label="End game and close room"
                    title="End game and close room"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-rose-600 hover:bg-rose-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {!joined ? (
          <JoinScreen
            playerName={playerName}
            onPlayerNameChange={setPlayerName}
            roomCode={roomCode}
            onRoomCodeChange={setRoomCode}
            isJoining={isJoining}
            onJoin={() => joinOrCreateRoom(roomCode || "MYST", false)}
            onCreate={() => {
              const code = (
                roomCode || Math.random().toString(36).slice(2, 6).toUpperCase()
              )
                .trim()
                .toUpperCase();
              setRoomCode(code);
              joinOrCreateRoom(code, true);
            }}
          />
        ) : room ? (
          <>
            {room.phase === "lobby" ? (
              <LobbyScreen
                room={room}
                isHost={room.hostId === playerId}
                onStartGame={() => startGame(false)}
                onStartWithTestPlayers={() => startGame(true)}
                onStartAnyway={() => startGame(false, true)}
              />
            ) : room.phase === "finished" ? (
              <FinishedScreen
                room={room}
                isHost={room.hostId === playerId}
                allCorrectlyIdentified={allCorrectlyIdentified}
                winnerForm={winnerForm}
                onWinnerFormChange={setWinnerForm}
                winnerSaveStatus={winnerSaveStatus}
                onSubmitWinner={submitWinner}
                onStartNextGame={startNextGame}
              />
            ) : (
              <div className="relative rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                {isTransitioning && <TransitionOverlay label="Loading new game..." />}
                <GameHeader
                  round={room.round}
                  phase={room.phase}
                  onOpenMenu={() => setActiveModal({ type: "menu" })}
                />

                <div className="mt-4">
                  <PlayerList
                    room={room}
                    playerId={playerId}
                    activeChatBubble={activeChatBubble}
                    onOpenWindowView={(id) =>
                      setActiveModal({ type: "window", playerId: id })
                    }
                  />
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {joined && room && room.phase !== "lobby" && room.phase !== "finished" && (
        <ActionBar
          phase={room.phase}
          isMyTurn={isMyTurn}
          onSelectRank={() => setActiveModal({ type: "rank" })}
          onOpenScratchpad={() => setActiveModal({ type: "scratchpad" })}
          onGuessCard={() => setActiveModal({ type: "guess" })}
          onSendEmote={handleSendChat}
        />
      )}

      {activeModal?.type === "rank" && room && (
        <RankSelectModal
          playerCount={room.players.length}
          onSelect={submitRanking}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === "guess" && (
        <GuessCardModal
          guessingCards={guessingCards}
          pendingGuess={pendingGuess}
          onSelectCard={selectGuessCard}
          onConfirm={submitGuess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === "scratchpad" && room && playerId && (
        <ScratchpadModal
          scratchpad={scratchpad}
          myPlayerId={playerId}
          players={room.players}
          onToggle={toggleScratchpad}
          onClear={clearScratchpad}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === "window" && windowViewTarget && playerId && room && (
        <WindowViewModal
          targetPlayer={windowViewTarget}
          viewerPlayerId={playerId}
          players={room.players}
          suit={suitForGame(room.gameNumber)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === "menu" && (
        <MenuModal onLeaveGame={handleLeaveGame} onClose={() => setActiveModal(null)} />
      )}

      {binkPlayerName && <CorrectGuessPopup playerName={binkPlayerName} closing={binkClosing} />}
    </main>
  );
}
