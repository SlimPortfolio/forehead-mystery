"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActiveModal,
  CARD_POOL,
  CardState,
  ChatMessage,
  GamePhase,
  Player,
  Room,
  suitForGame,
} from "@/components/game/types";
import AppHeader from "@/components/game/AppHeader";
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
import HelpModal from "@/components/game/HelpModal";
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
  const [status, setStatus] = useState("");
  const [pendingGuess, setPendingGuess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [scratchpad, setScratchpad] = useState<Record<string, CardState>>({});
  const [winnerForm, setWinnerForm] = useState({
    teamName: "",
    date: "",
    time: "",
    city: "",
    state: "",
    country: "",
  });
  const [winnerSaveStatus, setWinnerSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [binkPlayerName, setBinkPlayerName] = useState<string | null>(null);
  const [binkClosing, setBinkClosing] = useState(false);
  const [activeChatBubbles, setActiveChatBubbles] = useState<Record<string, string>>({});
  const previousPhaseRef = useRef<GamePhase | null>(null);
  const roomRef = useRef<Room | null>(null);
  const suppressPollUntilRef = useRef<number>(0);
  const winnerFormInitializedRef = useRef(false);
  const binkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const binkCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConfirmationPhaseRef = useRef(false);
  const chatTimeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastChatTsRefs = useRef<Record<string, number>>({});

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
      setWinnerForm({
        teamName: "",
        date: "",
        time: "",
        city: "",
        state: "",
        country: "",
      });
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
  // would fire (and cancel the pending clear) if this effect re-ran ~2s
  // later when the phase moves on, leaving the popup stuck on screen
  // indefinitely instead of clearing itself.
  //
  // Derived from synced room state (who's at turnOrder[currentTurnIndex]
  // and their isCorrectlyIdentified flag) rather than local action-time
  // state, so every connected client sees the popup — not just whoever
  // happened to submit the guess.
  useEffect(() => {
    if (!room) return;

    const enteredConfirmation =
      room.phase === "confirmation" && !wasConfirmationPhaseRef.current;
    wasConfirmationPhaseRef.current = room.phase === "confirmation";

    if (!enteredConfirmation) return;

    const actingPlayer = room.players.find(
      (player) => player.id === room.turnOrder[room.currentTurnIndex],
    );
    if (!actingPlayer?.isCorrectlyIdentified) return;

    setBinkPlayerName(actingPlayer.name);
    setBinkClosing(false);
    if (binkTimeoutRef.current) clearTimeout(binkTimeoutRef.current);
    if (binkCloseTimeoutRef.current) clearTimeout(binkCloseTimeoutRef.current);

    binkTimeoutRef.current = setTimeout(() => setBinkClosing(true), 1200);
    binkCloseTimeoutRef.current = setTimeout(() => {
      setBinkPlayerName(null);
      setBinkClosing(false);
    }, 1500);
  }, [room?.phase, room?.currentTurnIndex]);

  useEffect(() => {
    return () => {
      if (binkCloseTimeoutRef.current) clearTimeout(binkCloseTimeoutRef.current);
      if (binkTimeoutRef.current) clearTimeout(binkTimeoutRef.current);
    };
  }, []);

  // Show a chat speech bubble per player, each with its own duration and
  // ref-based timer (same non-cleanup-driven pattern as the bink popup) so
  // one player's message expiring can't cancel another's pending clear, and
  // multiple players emoting at once each get their own bubble instead of
  // clobbering a single shared "latest message" slot.
  useEffect(() => {
    const messages = room?.chatMessages;
    if (!messages) return;

    for (const [senderId, message] of Object.entries(messages)) {
      if (message.ts === lastChatTsRefs.current[senderId]) continue;
      lastChatTsRefs.current[senderId] = message.ts;

      setActiveChatBubbles((current) => ({ ...current, [senderId]: message.text }));

      const existingTimeout = chatTimeoutRefs.current[senderId];
      if (existingTimeout) clearTimeout(existingTimeout);
      chatTimeoutRefs.current[senderId] = setTimeout(() => {
        setActiveChatBubbles((current) => {
          const next = { ...current };
          delete next[senderId];
          return next;
        });
      }, 4000);
    }
  }, [room?.chatMessages]);

  useEffect(() => {
    return () => {
      Object.values(chatTimeoutRefs.current).forEach(clearTimeout);
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
              JSON.stringify(fetchedRoom.chatMessages ?? {}) !==
                JSON.stringify(currentRoom.chatMessages ?? {}) ||
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

  // Host-only: these auto-advance effects run identically on every connected
  // client. Without gating to a single writer, multiple clients race to
  // independently PATCH the same transition — a slower client's stale
  // computation can silently clobber a faster one's, which looks like an
  // action "not sending" to other players.
  useEffect(() => {
    if (!room || !playerId || room.phase !== "ranking" || room.hostId !== playerId) return;

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
    if (!room || !playerId || room.phase !== "guessing" || room.hostId !== playerId) return;

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

      submitRoomState(nextRoom);
    }, 500);

    return () => clearTimeout(timer);
  }, [room, playerId]);

  useEffect(() => {
    if (!room || !playerId || room.phase !== "confirmation" || room.hostId !== playerId) return;

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

  // "In a game" = joined and mid-play (not the lobby or the finished screen).
  // Used to guard against accidentally abandoning an active game via refresh,
  // the browser back button, or clicking the logo/winners link.
  const isInActiveGame = Boolean(
    joined &&
      room &&
      (room.phase === "ranking" ||
        room.phase === "guessing" ||
        room.phase === "confirmation"),
  );

  // Warn before a full page unload (refresh, tab close, or a back-button that
  // leaves the document) while a game is in progress. The browser shows its
  // own generic confirmation prompt; the message string is ignored by modern
  // browsers but returnValue must be set for the prompt to appear.
  useEffect(() => {
    if (!isInActiveGame) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInActiveGame]);

  // Clicking the logo returns to the home/join screen. Because the game view
  // lives at "/" as a client-side SPA, we reset local state rather than route,
  // confirming first if a game is in progress so it isn't abandoned by mistake.
  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (
      isInActiveGame &&
      !window.confirm(
        "Leave the current game and return to the home screen?",
      )
    ) {
      return;
    }
    setJoined(false);
    setActiveModal(null);
    setStatus("");
  };

  const submitWinner = async () => {
    if (!room) return;
    const isInternational = winnerForm.state === "INTL";
    const region = isInternational ? winnerForm.country : winnerForm.state;
    if (
      !winnerForm.teamName.trim() ||
      !winnerForm.date ||
      !winnerForm.time ||
      !winnerForm.city.trim() ||
      !region
    ) {
      setStatus(
        isInternational
          ? "Please fill in team name, city, and country."
          : "Please fill in team name, city, and state.",
      );
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
          location: `${winnerForm.city.trim()}, ${region}`,
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

    const sendPatch = () =>
      fetch(`${appUrl}/api/rooms/${nextRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextRoom),
      }).then((response) => {
        if (!response.ok) throw new Error(`PATCH failed: ${response.status}`);
      });

    // A silently-dropped PATCH (flaky network, transient server error) used
    // to just vanish — the sender's own screen looked right, but nobody
    // else ever received the move, and the suppression window above then
    // masked the local/server mismatch until it "corrected" itself back to
    // the stale state on the next poll. Retry once, and if that also fails,
    // drop the suppression window immediately so the next poll can resync
    // instead of leaving everyone silently diverged.
    sendPatch().catch(() => {
      sendPatch().catch(() => {
        suppressPollUntilRef.current = 0;
      });
    });
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

      if (!createNew && !existingRoom) {
        setStatus(
          `Room ${normalizedCode} doesn't exist yet. Double-check the code, or create a new room instead.`,
        );
        return;
      }

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

  const startGame = (
    useTestPlayers = false,
    skipMinPlayers = false,
    targetPlayerCount?: number,
  ) => {
    if (!room || !myPlayer || !room.players.length) return;
    if (room.hostId !== playerId) {
      setStatus("Only the host can begin the game.");
      return;
    }

    let playersToUse = room.players;
    if (useTestPlayers) {
      const desiredTotal = targetPlayerCount ?? 4;
      const numTestPlayers = desiredTotal - room.players.length;
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
      turnOrder: shuffle(nextPlayers.map((player) => player.id)),
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
    const message: ChatMessage = { text, ts: Date.now() };

    // Optimistically show our own bubble immediately. We only touch our own
    // slot in chatMessages and leave every other field untouched.
    setRoom((current) =>
      current
        ? {
            ...current,
            chatMessages: {
              ...(current.chatMessages ?? {}),
              [playerId]: message,
            },
          }
        : current,
    );

    // Scoped write: a dotted path so the server updates ONLY this player's
    // chat slot. Unlike submitRoomState, this never sends players/phase/turn,
    // so an emote can't clobber a move another player is submitting at the
    // same time. We also deliberately don't trip suppressPollUntilRef here, so
    // an emoting player keeps receiving others' moves in real time.
    const sendEmote = () =>
      fetch(`${appUrl}/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [`chatMessages.${playerId}`]: message }),
      }).then((response) => {
        if (!response.ok) throw new Error(`PATCH failed: ${response.status}`);
      });

    sendEmote().catch(() => sendEmote().catch(() => {}));
    setActiveModal(null);
  };

  const guessingCards = useMemo(() => {
    if (!room || !myPlayer) return [] as string[];
    const otherPlayersCards = room.players
      .filter((p) => p.id !== myPlayer.id)
      .flatMap((p) => (p.card ? [p.card] : []));
    // A wrong guess is always an undealt rank (a guesser can never select
    // another visible player's card in the first place), so it can never be
    // anyone else's actual card either — safe to rule it out for every
    // remaining guesser, not just the player who tried it.
    const allEliminatedGuesses = room.players.flatMap((p) => p.eliminatedGuesses);
    return CARD_POOL.filter(
      (card) =>
        !otherPlayersCards.includes(card) &&
        !allEliminatedGuesses.includes(card),
    );
  }, [room, myPlayer]);

  const windowViewTarget =
    activeModal?.type === "window"
      ? (room?.players.find((p) => p.id === activeModal.playerId) ?? null)
      : null;

  // The bottom action bar is only for active play. On the finished screen the
  // scratchpad is reached via a dedicated "Review Scratchpad" button instead,
  // so we don't show a bar full of grayed-out Rank/Guess actions there.
  const showActionBar = Boolean(
    joined && room && room.phase !== "lobby" && room.phase !== "finished",
  );

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)] text-ink">
      <AppHeader onLogoClick={handleLogoClick}>
        {joined && room && room.hostId === playerId && room.phase !== "lobby" && (
          <>
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
          </>
        )}
        <button
          onClick={() => setActiveModal({ type: "help" })}
          aria-label="How it works"
          title="How it works"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5" strokeLinecap="round" />
            <path d="M12 17h.01" strokeLinecap="round" />
          </svg>
        </button>
        <Link
          href="/winners"
          aria-label="Winners page"
          title="Hall of Fame"
          onNavigate={(event) => {
            if (
              isInActiveGame &&
              !window.confirm(
                "Leave the current game to view the Hall of Fame?",
              )
            ) {
              event.preventDefault();
            }
          }}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-amber-500 hover:bg-amber-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path
              d="M6 4h12v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V4z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M6 5H4a2 2 0 0 0 2 3M18 5h2a2 2 0 0 1-2 3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 11v3M14 11v3M8 20h8M9 20l.5-3h5l.5 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </AppHeader>

      <div className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col gap-3">
        {!joined && status && (
          <p className="px-3 text-xs font-medium text-ink/70 sm:px-6">{status}</p>
        )}

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
                status={status}
                isHost={room.hostId === playerId}
                onStartGame={() => startGame(false)}
                onStartWithBots={(totalPlayers) => startGame(true, false, totalPlayers)}
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
                onReviewScratchpad={() => setActiveModal({ type: "scratchpad" })}
              />
            ) : (
              <div className="relative flex-1 min-h-0 overflow-y-auto border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur sm:p-4">
                {isTransitioning && <TransitionOverlay label="Loading new game..." />}
                <GameHeader
                  round={room.round}
                  phase={room.phase}
                  onOpenMenu={() => setActiveModal({ type: "menu" })}
                />

                <div className="mt-3">
                  <PlayerList
                    room={room}
                    playerId={playerId}
                    activeChatBubbles={activeChatBubbles}
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

      {showActionBar && room && (
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

      {activeModal?.type === "help" && (
        <HelpModal onClose={() => setActiveModal(null)} />
      )}

      {binkPlayerName && <CorrectGuessPopup playerName={binkPlayerName} closing={binkClosing} />}
    </main>
  );
}
