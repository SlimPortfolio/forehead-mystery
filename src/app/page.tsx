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
  PostGameChatMessage,
  Room,
  suitForGame,
} from "@/components/game/types";
import AppHeader from "@/components/game/AppHeader";
import HeaderActions from "@/components/game/HeaderActions";
import JoinScreen from "@/components/game/JoinScreen";
import LobbyScreen from "@/components/game/LobbyScreen";
import FinishedScreen from "@/components/game/FinishedScreen";
import GameHeader from "@/components/game/GameHeader";
import PlayerList from "@/components/game/PlayerList";
import ActionBar from "@/components/game/ActionBar";
import RankSelectModal from "@/components/game/RankSelectModal";
import GuessCardModal from "@/components/game/GuessCardModal";
import ScratchpadModal from "@/components/game/ScratchpadModal";
import LookingGlassModal from "@/components/game/LookingGlassModal";
import HelpModal from "@/components/game/HelpModal";
import CorrectGuessPopup from "@/components/game/CorrectGuessPopup";
import { computeGameMetrics } from "@/lib/metrics";
import TransitionOverlay from "@/components/game/TransitionOverlay";
import PendingJoinScreen from "@/components/game/PendingJoinScreen";
import RemovedFromRoomScreen from "@/components/game/RemovedFromRoomScreen";
import KickPlayerModal from "@/components/game/KickPlayerModal";

const POLL_INTERVAL_MS = 2000;
const NEW_GAME_TRANSITION_MS = 900;
const MAX_ROOM_PLAYERS = 8;
// Bots draw a random (unique) name from this pool instead of "Test Player N".
const TEST_PLAYER_NAMES = [
  "Lisbon",
  "Berlin",
  "Denver",
  "Moscow",
  "Helsinki",
  "Nairobi",
  "Tokyo",
  "Rio",
  "Stockholm",
  "Bogota",
  "Oslo",
  "Marseille",
  "Manila",
];
const STORAGE_PREFIX = "forehead-mystery-room";
const PLAYER_ID_KEY = "forehead-mystery-player-id";
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168."));

const appUrl = (
  (process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000")) as string
).replace(/\/$/, "");

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// Bots are created with `createId("test-player")`. Detect them by id prefix
// rather than display name so renaming the bot name pool never disables them.
function isBotPlayer(player: { id: string }) {
  return player.id.startsWith("test-player");
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

// Strips a player out of the room: drops them from `players` and
// `turnOrder`, shifts `currentTurnIndex` down if the removed seat was ahead
// of it, and promotes the next remaining player to host if the departing
// player was the host. Shared by both "leave" and "kick" so a removed
// player never lingers as a ghost seat that a later "start next game" would
// try to deal cards to.
function removePlayerFromRoom(room: Room, removedPlayerId: string): Room {
  const nextPlayers = room.players.filter(
    (player) => player.id !== removedPlayerId,
  );

  const removedIndexInOrder = room.turnOrder.indexOf(removedPlayerId);
  const nextTurnOrder = room.turnOrder.filter((id) => id !== removedPlayerId);

  let nextCurrentTurnIndex = room.currentTurnIndex;
  if (removedIndexInOrder !== -1 && removedIndexInOrder < room.currentTurnIndex) {
    nextCurrentTurnIndex -= 1;
  }

  const nextHostId =
    room.hostId === removedPlayerId
      ? (nextPlayers[0]?.id ?? "")
      : room.hostId;

  const playersWithHost = nextPlayers.map((player) => ({
    ...player,
    isHost: player.id === nextHostId,
  }));

  return {
    ...room,
    players: playersWithHost,
    turnOrder: nextTurnOrder,
    currentTurnIndex: nextCurrentTurnIndex,
    hostId: nextHostId,
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

// Blind-guess strategy for the ranking phase: without knowing its own card,
// the bot looks at everyone else's visible cards and guesses the rank that
// sits in the largest gap between known values, since that's the rank most
// likely to be correct.
function findBestRank(otherCards: string[]): number {
  if (otherCards.length === 0) return 1;

  const sortedValues = otherCards
    .map((card) => getCardValue(card))
    .sort((a, b) => a - b);

  const gaps: number[] = [sortedValues[0] - 1];
  for (let i = 0; i < sortedValues.length - 1; i++) {
    gaps.push(sortedValues[i + 1] - sortedValues[i] - 1);
  }
  gaps.push(13 - sortedValues[sortedValues.length - 1]);
  gaps.reverse();

  let largestGap = 0;
  let bestRank = 1;
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] > largestGap) {
      largestGap = gaps[i];
      bestRank = i + 1;
    }
  }

  return bestRank;
}

function getTestPlayerRanking(
  testPlayer: Player,
  allPlayers: Player[],
): number {
  const otherCards = allPlayers
    .filter((p) => p.id !== testPlayer.id)
    .map((p) => p.card)
    .filter((c): c is string => !!c);

  return findBestRank(otherCards);
}

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isHighEloMatch, setIsHighEloMatch] = useState(false);
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
  const [activeChatBubbles, setActiveChatBubbles] = useState<
    Record<string, string>
  >({});
  const previousPhaseRef = useRef<GamePhase | null>(null);
  const roomRef = useRef<Room | null>(null);
  const suppressPollUntilRef = useRef<number>(0);
  const winnerFormInitializedRef = useRef(false);
  const binkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const binkCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const wasConfirmationPhaseRef = useRef(false);
  const chatTimeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const lastChatTsRefs = useRef<Record<string, number>>({});
  const lastPostGameChatSentRef = useRef<number>(0);

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
    setIsHighEloMatch(params.has("highElo"));
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
      if (binkCloseTimeoutRef.current)
        clearTimeout(binkCloseTimeoutRef.current);
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

      setActiveChatBubbles((current) => ({
        ...current,
        [senderId]: message.text,
      }));

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
          if (!fetchedRoom && currentRoom) {
            // The room doc is gone — either it expired from inactivity (see
            // the TTL index in src/lib/mongodb.ts) or someone deleted it.
            // Send this client back to the home screen instead of leaving
            // it stuck showing a room that no longer exists server-side.
            setRoom(null);
            setJoined(false);
            setStatus("This room was closed due to inactivity.");
            return;
          }
          if (fetchedRoom && currentRoom) {
            // Deep comparison to detect changes
            if (
              fetchedRoom.phase !== currentRoom.phase ||
              fetchedRoom.round !== currentRoom.round ||
              fetchedRoom.currentTurnIndex !== currentRoom.currentTurnIndex ||
              fetchedRoom.players.length !== currentRoom.players.length ||
              fetchedRoom.turnOrder.join(",") !==
                currentRoom.turnOrder.join(",") ||
              JSON.stringify(fetchedRoom.chatMessages ?? {}) !==
                JSON.stringify(currentRoom.chatMessages ?? {}) ||
              JSON.stringify(fetchedRoom.postGameChat ?? []) !==
                JSON.stringify(currentRoom.postGameChat ?? []) ||
              JSON.stringify(fetchedRoom.players) !==
                JSON.stringify(currentRoom.players)
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
    if (
      !room ||
      !playerId ||
      room.phase !== "ranking" ||
      room.hostId !== playerId
    )
      return;

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    const currentPlayerInTurn = room.players.find(
      (p) => p.id === currentPlayerId,
    );

    if (
      !currentPlayerInTurn ||
      !isBotPlayer(currentPlayerInTurn) ||
      currentPlayerInTurn.ranking
    )
      return;

    const timer = setTimeout(() => {
      const testRank = getTestPlayerRanking(currentPlayerInTurn, room.players);
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
    }, 2000);

    return () => clearTimeout(timer);
  }, [room, playerId]);

  useEffect(() => {
    if (
      !room ||
      !playerId ||
      room.phase !== "guessing" ||
      room.hostId !== playerId
    )
      return;

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    const currentPlayerInTurn = room.players.find(
      (p) => p.id === currentPlayerId,
    );

    if (
      !currentPlayerInTurn ||
      !isBotPlayer(currentPlayerInTurn)
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
              isCorrectlyIdentified: wasCorrect || p.isCorrectlyIdentified,
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
    if (
      !room ||
      !playerId ||
      room.phase !== "confirmation" ||
      room.hostId !== playerId
    )
      return;

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

      // Natural completion only — early ends (host end / leave / kick) don't
      // run through this effect, so abandoned games are never logged.
      if (nextRoom.phase === "finished") {
        logGameMetrics(nextRoom);
      }
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

  // Tint the whole screen when it's genuinely this player's turn to act, so
  // they immediately notice the game is waiting on them. Gated to the active
  // turn phases — `isMyTurn` is also true for whoever sits at turnOrder[0] in
  // the lobby / finished screens, where a highlight would be misleading.
  const isMyActiveTurn = Boolean(
    isMyTurn &&
    room &&
    (room.phase === "ranking" || room.phase === "guessing"),
  );
  const myPlayer = useMemo(
    () => room?.players.find((player) => player.id === playerId) ?? null,
    [room, playerId],
  );

  // Players who actually took part in the current/most recent game — anyone
  // who joined mid-game and hasn't been dealt in yet is excluded from
  // rosters, results, and the perfect-game check for that game.
  const activePlayers = useMemo(
    () => room?.players.filter((player) => !player.pendingJoin) ?? [],
    [room],
  );

  const allCorrectlyIdentified = Boolean(
    room &&
    room.phase === "finished" &&
    activePlayers.length > 0 &&
    activePlayers.every((player) => player.isCorrectlyIdentified),
  );

  // Bots always guess their own card correctly, so any game they're part of
  // is guaranteed to be a "perfect game" — that's not a real win, so it must
  // never be eligible for the winners log.
  const isBotGame = activePlayers.some((player) => isBotPlayer(player));

  const isHost = Boolean(room && playerId && room.hostId === playerId);

  // True once a poll picks up that the host removed this player from the
  // room (they're still `joined` locally, but no longer in `room.players`).
  const wasRemovedFromRoom = Boolean(joined && room && playerId && !myPlayer);

  const isPendingForActiveGame = Boolean(
    myPlayer?.pendingJoin &&
    room &&
    (room.phase === "ranking" ||
      room.phase === "guessing" ||
      room.phase === "confirmation"),
  );

  // A perfect game the host hasn't saved to the winners page yet. Used to
  // guard against losing it by starting the next game, ending the room, or
  // leaving/refreshing before it's recorded.
  const hasUnsavedPerfectGame = Boolean(
    isHost &&
    allCorrectlyIdentified &&
    !isBotGame &&
    winnerSaveStatus !== "saved",
  );

  const confirmDiscardUnsavedWin = () =>
    window.confirm(
      "This perfect game hasn't been saved to the winners page yet. Continue anyway?",
    );

  // "In a game" = joined, actually dealt into the current game, and mid-play
  // (not the lobby or the finished screen). A pendingJoin player has nothing
  // to lose by navigating away, so they're excluded. Used to guard against
  // accidentally abandoning an active game via refresh, the browser back
  // button, or clicking the logo/winners link.
  const isInActiveGame = Boolean(
    joined &&
    room &&
    myPlayer &&
    !myPlayer.pendingJoin &&
    (room.phase === "ranking" ||
      room.phase === "guessing" ||
      room.phase === "confirmation"),
  );

  // Warn before a full page unload (refresh, tab close, or a back-button that
  // leaves the document) while a game is in progress, or while a perfect
  // game is still unsaved. The browser shows its own generic confirmation
  // prompt; the message string is ignored by modern browsers but
  // returnValue must be set for the prompt to appear.
  useEffect(() => {
    if (!isInActiveGame && !hasUnsavedPerfectGame) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInActiveGame, hasUnsavedPerfectGame]);

  // Clicking the logo returns to the home/join screen. Because the game view
  // lives at "/" as a client-side SPA, we reset local state rather than route,
  // confirming first if a game is in progress so it isn't abandoned by mistake.
  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (
      isInActiveGame &&
      !window.confirm("Leave the current game and return to the home screen?")
    ) {
      return;
    }
    if (hasUnsavedPerfectGame && !confirmDiscardUnsavedWin()) {
      return;
    }
    setJoined(false);
    setActiveModal(null);
    setStatus("");
  };

  const submitWinner = async () => {
    if (!room || isBotGame) return;
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
          players: activePlayers.map((player) => ({
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

  // Fire-and-forget analytics write for a naturally-completed game. Only ever
  // called from the host-only confirmation effect, so exactly one write lands
  // per game. Bot games are skipped (bots always guess correctly, which would
  // skew the data) just like the winners log. A logging failure is swallowed
  // so it can never disrupt gameplay.
  const logGameMetrics = (finishedRoom: Room) => {
    const active = finishedRoom.players.filter((player) => !player.pendingJoin);
    if (active.length === 0) return;
    if (active.some((player) => isBotPlayer(player))) return;

    const highEloMatch =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("highElo");

    fetch(`${appUrl}/api/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(computeGameMetrics(active, highEloMatch)),
    }).catch((error) => console.error("Failed to log game metrics", error));
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

      // --- Create a brand-new room ---
      // A freshly created room has no other writers yet, so the full-room
      // write via submitRoomState is safe here.
      if (createNew || !existingRoom) {
        if (!createNew && !existingRoom) {
          setStatus(
            `Room ${normalizedCode} doesn't exist yet. Double-check the code, or create a new room instead.`,
          );
          return;
        }
        const nextRoom = createRoom(normalizedCode, playerId, playerName.trim());
        setRoomCode(normalizedCode);
        setJoined(true);
        submitRoomState(nextRoom);
        setStatus(`Joined room ${normalizedCode}`);
        return;
      }

      // --- Join an existing room ---
      const alreadyJoined = existingRoom.players.some(
        (player) => player.id === playerId,
      );

      // Reconnecting to a room we're already in — no write at all, just drop
      // back into the current synced state and let polling take over.
      if (alreadyJoined) {
        setRoom(existingRoom);
        setRoomCode(normalizedCode);
        setJoined(true);
        setStatus(`Rejoined room ${normalizedCode}`);
        return;
      }

      // Enforce the 8-player cap before letting anyone new in. The server
      // re-checks this atomically, but this gives a clean message up front.
      if (existingRoom.players.length >= MAX_ROOM_PLAYERS) {
        setStatus(
          `Room ${normalizedCode} is full (${MAX_ROOM_PLAYERS} players max).`,
        );
        return;
      }

      // Joining while a game is already underway means this player sits the
      // current game out — they're marked pendingJoin so they're excluded
      // from turnOrder/dealing until the next game starts, at which point
      // they're folded in as if they'd been there from the start.
      const isMidGameJoin = existingRoom.phase !== "lobby";
      const newPlayer: Player = {
        id: playerId,
        name: playerName.trim(),
        isHost: false,
        isReady: true,
        eliminatedGuesses: [],
        isCorrectlyIdentified: false,
        pendingJoin: isMidGameJoin,
      };

      // Scoped, atomic append (see /api/rooms/[roomCode]). We send ONLY our
      // own player, never the full room, so a join can never clobber a move
      // another player is submitting at the same moment. The server appends
      // us only if we're not already in and the room isn't full.
      const joinResponse = await fetch(`${appUrl}/api/rooms/${normalizedCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerJoin: newPlayer }),
      });
      if (!joinResponse.ok) {
        throw new Error(`Join failed: ${joinResponse.status}`);
      }
      const joinData = await joinResponse.json();
      const joinedRoom = joinData.room as Room | null;

      // The server hands back the authoritative room. If we're not in its
      // player list, the last seat filled between our check and the write
      // (a simultaneous join won the race).
      const didJoin = Boolean(
        joinedRoom?.players.some((player) => player.id === playerId),
      );
      if (!joinedRoom || !didJoin) {
        setStatus(
          `Room ${normalizedCode} is full (${MAX_ROOM_PLAYERS} players max).`,
        );
        return;
      }

      setRoom(joinedRoom);
      setRoomCode(normalizedCode);
      setJoined(true);
      setStatus(
        isMidGameJoin
          ? `Joined room ${normalizedCode}. A game is already in progress — you'll join the next one.`
          : `Joined room ${normalizedCode}`,
      );
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
        errorMessage +=
          " (Local: Make sure your dev server is running on port 3000)";
      }

      setStatus(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const startNextGame = () => {
    if (!room || !myPlayer) return;
    if (hasUnsavedPerfectGame && !confirmDiscardUnsavedWin()) return;

    // Rotate the turn order so whoever went second last game goes first now.
    // Anyone who joined mid-previous-game (pendingJoin) was never part of
    // that turnOrder — fold them in now, in random order, since this is
    // their first game. Also drop any id no longer in `players` (e.g. a
    // player who left or was kicked since the last turnOrder was set).
    const returningOrder = room.turnOrder.filter((id) =>
      room.players.some((player) => player.id === id && !player.pendingJoin),
    );
    const [previousFirstPlayer, ...restOfOrder] = returningOrder;
    const rotatedReturningOrder = previousFirstPlayer
      ? [...restOfOrder, previousFirstPlayer]
      : restOfOrder;
    const newJoinerIds = shuffle(
      room.players
        .filter((player) => player.pendingJoin)
        .map((player) => player.id),
    );
    const rotatedTurnOrder = [...rotatedReturningOrder, ...newJoinerIds];

    // Deal new cards
    const shuffledCards = shuffle(CARD_POOL).slice(0, room.players.length);
    const nextPlayers = room.players.map((player, index) => ({
      ...player,
      card: shuffledCards[index],
      ranking: null,
      guess: null,
      eliminatedGuesses: [],
      isCorrectlyIdentified: false,
      pendingJoin: false,
    }));

    const nextRoom: Room = {
      ...room,
      players: nextPlayers,
      phase: "ranking",
      round: 1,
      currentTurnIndex: 0,
      turnOrder: rotatedTurnOrder,
      gameNumber: (room.gameNumber ?? 1) + 1,
      postGameChat: [],
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
      const botNames = shuffle(TEST_PLAYER_NAMES);
      const testPlayers: Player[] = Array.from(
        { length: Math.max(0, numTestPlayers) },
        (_, i) => ({
          id: createId("test-player"),
          name: `${botNames[i] ?? `Test Player ${i + 1}`} BOT`,
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
      pendingJoin: false,
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

    const nextPlayers = room.players.map((player) =>
      player.id === myPlayer.id ? { ...player, ranking: rank } : player,
    );

    const nextTurnIndex = room.currentTurnIndex + 1;
    // Any following test-player turns are picked up and resolved (with a
    // pondering delay) by the ranking-phase bot effect above, rather than
    // being resolved instantly here.
    const nextPhase: GamePhase =
      nextTurnIndex >= room.turnOrder.length ? "guessing" : "ranking";

    const nextRoom: Room = {
      ...room,
      players: nextPlayers,
      currentTurnIndex: nextPhase === "guessing" ? 0 : nextTurnIndex,
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
    if (
      !room ||
      !myPlayer ||
      !isMyTurn ||
      room.phase !== "guessing" ||
      !pendingGuess
    )
      return;

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

  // Scoped, atomic removal of a player who isn't part of the active game (a
  // spectator waiting for the next game). Sends ONLY their id via $pull, so
  // it can't clobber a move an active player is submitting at the same time.
  // Updates local state optimistically without a full-room write and without
  // tripping the poll-suppression window, mirroring the emote/chat pattern.
  const removePendingPlayer = (removedPlayerId: string) => {
    setRoom((current) =>
      current
        ? {
            ...current,
            players: current.players.filter(
              (player) => player.id !== removedPlayerId,
            ),
          }
        : current,
    );

    const sendRemove = () =>
      fetch(`${appUrl}/api/rooms/${room?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerRemove: removedPlayerId }),
      }).then((response) => {
        if (!response.ok) throw new Error(`PATCH failed: ${response.status}`);
      });

    sendRemove().catch(() => sendRemove().catch(() => {}));
  };

  const handleLeaveGame = () => {
    if (!room || !myPlayer) return;
    // A spectator waiting for the next game was never part of the active
    // game, so leaving shouldn't end it for everyone else — and it goes
    // through the scoped removal so it can't clobber a move in flight.
    if (myPlayer.pendingJoin) {
      removePendingPlayer(myPlayer.id);
      setActiveModal(null);
      setJoined(false);
      setStatus("You left the game.");
      return;
    }
    // An actively-playing player leaving still ends the game for the room
    // (existing behavior), just without leaving a ghost seat behind for the
    // next game.
    const nextRoom = removePlayerFromRoom(room, myPlayer.id);
    submitRoomState({ ...nextRoom, phase: "finished" });
    setActiveModal(null);
    setJoined(false);
    setStatus("You left the game.");
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    if (!room || room.hostId !== playerId) return;
    const target = room.players.find((player) => player.id === targetPlayerId);
    if (!target) return;
    if (!window.confirm(`Remove ${target.name} from the room?`)) return;

    // Kicking a spectator (not in the active game) needs no game-state change
    // and uses the scoped removal so it can't clobber an in-flight move.
    if (target.pendingJoin) {
      removePendingPlayer(targetPlayerId);
      setActiveModal(null);
      setStatus(`${target.name} was removed from the room.`);
      return;
    }

    let nextRoom = removePlayerFromRoom(room, targetPlayerId);

    // If the kicked player was mid-turn (or every remaining turn has already
    // passed once they're removed), advance the phase the same way the
    // normal turn-completion logic would, so the game doesn't stall waiting
    // on a player who's no longer here.
    const isActiveTurnPhase =
      room.phase === "ranking" ||
      room.phase === "guessing" ||
      room.phase === "confirmation";
    if (isActiveTurnPhase) {
      if (nextRoom.turnOrder.length === 0) {
        nextRoom = { ...nextRoom, phase: "finished", currentTurnIndex: 0 };
      } else if (nextRoom.currentTurnIndex >= nextRoom.turnOrder.length) {
        nextRoom =
          room.phase === "ranking"
            ? { ...nextRoom, phase: "guessing", currentTurnIndex: 0, round: 2 }
            : { ...nextRoom, phase: "finished" };
      }
    }

    submitRoomState(nextRoom);
    setActiveModal(null);
    setStatus(`${target.name} was removed from the room.`);
  };

  const handleEndGame = () => {
    if (!room) return;
    if (hasUnsavedPerfectGame && !confirmDiscardUnsavedWin()) {
      return;
    }
    if (!window.confirm("End the game and close the room for everyone?")) {
      return;
    }
    submitRoomState({ ...room, phase: "finished" });
    setJoined(false);
    setActiveModal(null);
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

  // 2s client-side refractory period so a player mashing send can't fire a
  // burst of PATCH requests. Returns false (and sends nothing) while on
  // cooldown so the caller can decide how to reflect that in its own UI.
  const POST_GAME_CHAT_REFRACTORY_MS = 2000;
  const handleSendPostGameChat = (text: string): boolean => {
    if (!room || !playerId) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;

    const now = Date.now();
    if (now - lastPostGameChatSentRef.current < POST_GAME_CHAT_REFRACTORY_MS) {
      return false;
    }
    lastPostGameChatSentRef.current = now;

    const sender = room.players.find((player) => player.id === playerId);
    const message: PostGameChatMessage = {
      id: `${playerId}-${now}`,
      playerId,
      playerName: sender?.name ?? "Player",
      text: trimmed,
      ts: now,
    };

    // Optimistically append locally. The server write is scoped to a $push
    // (see /api/rooms/[roomCode]) rather than replacing the whole array, and
    // we deliberately don't trip suppressPollUntilRef — same reasoning as
    // handleSendChat above, so other players' concurrent messages still show
    // up in real time instead of being masked until the suppression window
    // clears.
    setRoom((current) =>
      current
        ? {
            ...current,
            postGameChat: [...(current.postGameChat ?? []), message],
          }
        : current,
    );

    const sendMessage = () =>
      fetch(`${appUrl}/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postGameChatAppend: message }),
      }).then((response) => {
        if (!response.ok) throw new Error(`PATCH failed: ${response.status}`);
      });

    sendMessage().catch(() => sendMessage().catch(() => {}));
    return true;
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
    const allEliminatedGuesses = room.players.flatMap(
      (p) => p.eliminatedGuesses,
    );
    return CARD_POOL.filter(
      (card) =>
        !otherPlayersCards.includes(card) &&
        !allEliminatedGuesses.includes(card),
    );
  }, [room, myPlayer]);

  const lookingGlassTarget =
    activeModal?.type === "lookingGlass"
      ? (room?.players.find((p) => p.id === activeModal.playerId) ?? null)
      : null;

  // The bottom action bar is only for active play. On the finished screen the
  // scratchpad is reached via a dedicated "Review Scratchpad" button instead,
  // so we don't show a bar full of grayed-out Rank/Guess actions there.
  const showActionBar = Boolean(
    joined &&
    room &&
    !wasRemovedFromRoom &&
    !isPendingForActiveGame &&
    room.phase !== "lobby" &&
    room.phase !== "finished",
  );

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)] text-ink">
      <AppHeader
        onLogoClick={handleLogoClick}
        badge={
          isHighEloMatch ? (
            <span className="rounded-full bg-pink-300 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-black">
              High Elo
            </span>
          ) : undefined
        }
      >
        <HeaderActions
          onWinnersNavigate={(event) => {
            if (
              isInActiveGame &&
              !window.confirm(
                "Leave the current game to view the Hall of Fame?",
              )
            ) {
              event.preventDefault();
            }
          }}
          onShowHelp={() => setActiveModal({ type: "help" })}
        />
      </AppHeader>

      <div className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col gap-3">
        {!joined ? (
          <JoinScreen
            playerName={playerName}
            onPlayerNameChange={setPlayerName}
            roomCode={roomCode}
            onRoomCodeChange={setRoomCode}
            isJoining={isJoining}
            status={status}
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
            onShowHelp={() => setActiveModal({ type: "help" })}
          />
        ) : room ? (
          <>
            {wasRemovedFromRoom ? (
              <RemovedFromRoomScreen
                onReturnHome={() => {
                  setJoined(false);
                  setActiveModal(null);
                  setStatus("");
                }}
              />
            ) : isPendingForActiveGame ? (
              <PendingJoinScreen room={room} onLeave={handleLeaveGame} />
            ) : room.phase === "lobby" ? (
              <LobbyScreen
                room={room}
                status={status}
                isHost={room.hostId === playerId}
                onStartGame={() => startGame(false)}
                onStartWithBots={(totalPlayers) =>
                  startGame(true, false, totalPlayers)
                }
              />
            ) : room.phase === "finished" ? (
              <FinishedScreen
                room={room}
                isHost={room.hostId === playerId}
                playerId={playerId}
                allCorrectlyIdentified={allCorrectlyIdentified}
                isBotGame={isBotGame}
                winnerForm={winnerForm}
                onWinnerFormChange={setWinnerForm}
                winnerSaveStatus={winnerSaveStatus}
                onSubmitWinner={submitWinner}
                onStartNextGame={startNextGame}
                onReviewScratchpad={() =>
                  setActiveModal({ type: "scratchpad" })
                }
                onOpenLookingGlass={(id) =>
                  setActiveModal({ type: "lookingGlass", playerId: id })
                }
                onSendPostGameChat={handleSendPostGameChat}
                shareUrl={`${appUrl}/?room=${room.id}`}
                onEndGame={handleEndGame}
                onRemovePlayer={() => setActiveModal({ type: "kickPlayer" })}
                onLeaveGame={handleLeaveGame}
              />
            ) : (
              <div
                className={`relative flex-1 min-h-0 overflow-y-auto border border-slate-200 p-3 shadow-sm backdrop-blur transition-colors duration-500 sm:p-4 ${
                  isMyActiveTurn
                    ? "bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)]"
                    : "bg-white/80"
                }`}
              >
                {isTransitioning && (
                  <TransitionOverlay label="Loading new game..." />
                )}
                <GameHeader
                  roomCode={room.id}
                  round={room.round}
                  phase={room.phase}
                  isHost={room.hostId === playerId}
                  shareUrl={`${appUrl}/?room=${room.id}`}
                  onStartNextGame={startNextGame}
                  onEndGame={handleEndGame}
                  onRemovePlayer={() => setActiveModal({ type: "kickPlayer" })}
                  onLeaveGame={handleLeaveGame}
                />

                <div className="mt-3">
                  <PlayerList
                    room={room}
                    playerId={playerId}
                    activeChatBubbles={activeChatBubbles}
                    onOpenLookingGlass={(id) =>
                      setActiveModal({ type: "lookingGlass", playerId: id })
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
          playerCount={activePlayers.length}
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
          players={activePlayers}
          onToggle={toggleScratchpad}
          onClear={clearScratchpad}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === "lookingGlass" &&
        lookingGlassTarget &&
        playerId &&
        room && (
          <LookingGlassModal
            targetPlayer={lookingGlassTarget}
            viewerPlayerId={playerId}
            players={activePlayers}
            suit={suitForGame(room.gameNumber)}
            onClose={() => setActiveModal(null)}
          />
        )}

      {activeModal?.type === "help" && (
        <HelpModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal?.type === "kickPlayer" && room && (
        <KickPlayerModal
          players={room.players}
          hostId={room.hostId}
          onKick={handleKickPlayer}
          onClose={() => setActiveModal(null)}
        />
      )}

      {binkPlayerName && (
        <CorrectGuessPopup playerName={binkPlayerName} closing={binkClosing} />
      )}
    </main>
  );
}
