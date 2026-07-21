"use client";

import { useEffect, useMemo, useState } from "react";

type CardState = "possible" | "impossible" | "most-likely";
type GamePhase = "lobby" | "ranking" | "guessing" | "confirmation" | "finished";

type Player = {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  card?: string;
  ranking?: number | null;
  guess?: string | null;
  eliminatedGuesses: string[];
  isCorrectlyIdentified: boolean;
};

type Room = {
  id: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  round: number;
  currentTurnIndex: number;
  turnOrder: string[];
};

const CARD_POOL = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const STORAGE_PREFIX = "forehead-mystery-room";
const PLAYER_ID_KEY = "forehead-mystery-player-id";
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
  };
}

function formatRank(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
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

  // Calculate the rank based on where the test player's card falls
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

  // Poll for room updates every 300ms when in an active game
  // Clear scratchpad when a new game starts
  useEffect(() => {
    if (!room || room.round !== 1 || room.currentTurnIndex !== 0) return;
    // Only clear if scratchpad is not already empty
    if (Object.keys(scratchpad).length > 0) {
      console.log("Clearing scratchpad for new game (round 1)");
      setScratchpad({});
      if (typeof window !== "undefined" && playerId) {
        window.localStorage.removeItem(
          `${STORAGE_PREFIX}:${room.id}:${playerId}`,
        );
      }
    }
  }, [room?.id, room?.round]);

  // Poll for room updates every 300ms when in an active game
  useEffect(() => {
    if (!roomCode || !joined) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${appUrl}/api/rooms?roomCode=${roomCode}`,
        );
        if (response.ok) {
          const data = await response.json();
          const fetchedRoom = data.room as Room | null;
          if (fetchedRoom && room) {
            // Deep comparison to detect changes
            if (
              fetchedRoom.phase !== room.phase ||
              fetchedRoom.round !== room.round ||
              fetchedRoom.currentTurnIndex !== room.currentTurnIndex ||
              fetchedRoom.players.length !== room.players.length ||
              JSON.stringify(fetchedRoom.players) !== JSON.stringify(room.players)
            ) {
              console.log("Room state updated:", {
                phase: fetchedRoom.phase,
                round: fetchedRoom.round,
              });
              setRoom(fetchedRoom);
            }
          }
        }
      } catch (error) {
        console.error("Failed to poll room state:", error);
      }
    }, 300);

    return () => clearInterval(pollInterval);
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

      const nextRoom: Room = {
        ...room,
        players: nextPlayers,
        phase: "guessing",
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
      let nextTurnIndex = room.currentTurnIndex + 1;

      let nextRoom: Room = {
        ...room,
      };

      if (nextTurnIndex >= room.turnOrder.length) {
        // All players have guessed
        if (room.round >= 2) {
          // 2 rounds complete - game ends
          nextRoom.phase = "finished";
        } else {
          // Start next round
          nextRoom.phase = "ranking";
          nextRoom.round += 1;
          nextRoom.currentTurnIndex = 0;
          nextRoom.players = room.players.map((player) => ({
            ...player,
            ranking: null,
            guess: null,
            eliminatedGuesses: [], // Reset eliminated guesses each round
          }));
        }
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

  const submitRoomState = (nextRoom: Room) => {
    setRoom(nextRoom);

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
        error,
      });
      setStatus(
        error instanceof Error
          ? `Room failed: ${error.message}`
          : "Unable to reach the room service.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  const startNextGame = () => {
    if (!room || !myPlayer) return;

    // Rotate the turn order so the next player goes first
    const nextFirstPlayerIndex = (room.turnOrder.indexOf(room.turnOrder[0]) + 1) % room.turnOrder.length;
    const rotatedTurnOrder = [
      ...room.turnOrder.slice(nextFirstPlayerIndex),
      ...room.turnOrder.slice(0, nextFirstPlayerIndex),
    ];

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
    };

    // Clear the scratchpad
    console.log("Clearing scratchpad for new game");
    setScratchpad({});
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(
        `${STORAGE_PREFIX}:${room.id}:${playerId}`,
      );
      console.log("Scratchpad localStorage cleared");
    }

    submitRoomState(nextRoom);
    setStatus("New game started! Begin with the ranking phase.");
  };

  const startGame = (useTestPlayers = false) => {
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

    if (playersToUse.length < 4 || playersToUse.length > 8) {
      setStatus("A game needs between 4 and 8 players to begin.");
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

    submitRoomState(nextRoom);
    setStatus("The game has started. Submit your ranking.");
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
    };

    submitRoomState(nextRoom);
    setPendingGuess(null);
    setStatus(
      nextPhase === "guessing"
        ? `All players ranked! Starting guessing phase.`
        : `You ranked ${formatRank(rank)}. Waiting for others to rank.`,
    );
  };

  const submitGuess = (card: string) => {
    if (!room || !myPlayer || !isMyTurn || room.phase !== "guessing") return;
    if (!pendingGuess) {
      setPendingGuess(card);
      setStatus(`Confirm ${card} as your guess.`);
      return;
    }

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
    setStatus(
      wasCorrect
        ? `✓ Correct! You have ${pendingGuess}.`
        : `✗ Incorrect. ${pendingGuess} is now eliminated.`,
    );
  };

  const toggleScratchpad = (card: string) => {
    setScratchpad((current) => ({
      ...current,
      [card]:
        current[card] === "possible"
          ? "impossible"
          : current[card] === "impossible"
            ? "most-likely"
            : "possible",
    }));
  };

  const visiblePlayers =
    room?.players.map((player) => ({
      ...player,
      card: player.id === playerId ? null : (player.card ?? null),
    })) ?? [];

  const visibleCards = useMemo(() => {
    if (!room) return [] as string[];
    return Array.from(
      new Set(
        room.players.flatMap((player) => (player.card ? [player.card] : [])),
      ),
    ) as string[];
  }, [room]);

  const allPossibleCards = CARD_POOL;

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,#fdf2f8_45%,#fef3c7)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">
                Forehead Mystery
              </p>
              <h1 className="text-3xl font-semibold">
                A social deduction game for 4–8 players
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Join a room, rank yourself, and use your scratchpad to narrow
                down the card you are hiding from everyone else.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-semibold">Room {roomCode || "—"}</div>
              <div>{status}</div>
            </div>
          </div>
        </header>

        {!joined ? (
          <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Join or create a room</h2>
              <label className="block text-sm font-medium text-slate-700">
                Your name
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
                  placeholder="Enter your display name"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Room code
                <input
                  value={roomCode}
                  onChange={(event) =>
                    setRoomCode(event.target.value.toUpperCase())
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-2"
                  placeholder="e.g. MYST"
                  maxLength={6}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => joinOrCreateRoom(roomCode || "MYST", false)}
                  disabled={isJoining}
                  className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-wait disabled:opacity-70"
                >
                  {isJoining ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Connecting...
                    </>
                  ) : (
                    "Join room"
                  )}
                </button>
                <button
                  onClick={() => {
                    const code = (
                      roomCode ||
                      Math.random().toString(36).slice(2, 6).toUpperCase()
                    )
                      .trim()
                      .toUpperCase();
                    setRoomCode(code);
                    joinOrCreateRoom(code, true);
                  }}
                  disabled={isJoining}
                  className="flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 font-medium disabled:cursor-wait disabled:opacity-70"
                >
                  {isJoining ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
                      Connecting...
                    </>
                  ) : (
                    "Create room"
                  )}
                </button>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-950 p-6 text-slate-100">
              <h3 className="text-lg font-semibold">How it works</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>
                  • Each player sees everyone else’s cards, but their own
                  remains hidden.
                </li>
                <li>
                  • Rank yourself each round and then submit a guess during your
                  turn.
                </li>
                <li>• Private scratchpad markings stay on your device only.</li>
              </ul>
            </div>
          </section>
        ) : room ? (
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Lobby
                    </p>
                    <h2 className="text-xl font-semibold">{room.id}</h2>
                  </div>
                  {room.hostId === playerId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startGame(false)}
                        className="rounded-2xl bg-amber-500 px-4 py-2 font-semibold text-white"
                      >
                        Start game
                      </button>
                      <button
                        onClick={() => startGame(true)}
                        className="rounded-2xl bg-slate-600 px-4 py-2 font-semibold text-white"
                      >
                        Start with test players
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-xs text-slate-500">
                            {player.isHost ? "Host" : "Player"}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          {player.isReady ? "Ready" : "Connecting"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                <h3 className="text-lg font-semibold">Private scratchpad</h3>
                <div className="mt-3 flex flex-col gap-2">
                  {[...allPossibleCards].reverse().map((card) => {
                    const otherPlayerCard = myPlayer && room?.players
                      .filter((p) => p.id !== myPlayer.id)
                      .some((p) => p.card === card);
                    const isDisabled = !!otherPlayerCard;
                    const state = isDisabled ? "impossible" : (scratchpad[card] ?? "possible");
                    const displayState =
                      state === "most-likely"
                        ? "Most likely"
                        : state === "impossible"
                          ? "Impossible"
                          : "Possible";

                    let className = `rounded-2xl border px-3 py-2 text-sm font-medium text-left`;
                    if (isDisabled) {
                      className += ` border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed opacity-60`;
                    } else if (state === "most-likely") {
                      className += ` border-amber-400 bg-amber-100 text-amber-800 cursor-pointer`;
                    } else if (state === "impossible") {
                      className += ` border-rose-300 bg-rose-50 text-rose-700 cursor-pointer`;
                    } else {
                      className += ` border-slate-300 bg-white text-slate-700 cursor-pointer`;
                    }

                    return (
                      <button
                        key={card}
                        onClick={() => !isDisabled && toggleScratchpad(card)}
                        disabled={isDisabled}
                        className={className}
                      >
                        {card} · {displayState}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Mark cards as possible, impossible, or most likely. Cards held by other players are automatically marked impossible.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              {room.phase === "lobby" ? (
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <h3 className="text-lg font-semibold">
                    Waiting for the host
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    The host can begin the game once there are 4–8 players in
                    the room.
                  </p>
                </div>
              ) : room.phase === "finished" ? (
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <h3 className="text-lg font-semibold">Game complete</h3>
                  <div className="mt-3 space-y-2">
                    {room.players.map((player) => (
                      <div
                        key={player.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span>{player.name}</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-sm font-medium text-emerald-700">
                            {player.card}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    Total rounds played: {room.round}
                  </p>
                  {room.hostId === playerId && (
                    <button
                      onClick={startNextGame}
                      className="mt-4 rounded-2xl bg-amber-500 px-4 py-2 font-semibold text-white"
                    >
                      Next game
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                        Round {room.round}
                      </p>
                      <h3 className="text-lg font-semibold">
                        {room.phase === "ranking"
                          ? "Ranking phase"
                          : "Guessing phase"}
                      </h3>
                    </div>
                    <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm text-white">
                      {currentPlayer?.name ?? "—"} to act
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-600">
                      {room.phase === "ranking"
                        ? "Select the rank you believe you hold relative to every other player."
                        : room.phase === "guessing"
                          ? "Choose the card you believe you hold. Confirm before locking it in."
                          : room.phase === "confirmation"
                            ? lastGuessResult
                              ? lastGuessResult.wasCorrect
                                ? `✓ ${lastGuessResult.playerName} correctly identified their card!`
                                : `✗ ${lastGuessResult.playerName} guessed ${lastGuessResult.card}.`
                              : "Revealing result..."
                            : ""}
                    </p>
                    {room.phase === "confirmation" ? (
                      <div className="mt-3">
                        <div
                          className={`rounded-2xl px-4 py-3 text-center font-semibold ${
                            lastGuessResult?.wasCorrect
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {lastGuessResult?.wasCorrect
                            ? `✓ Correct! ${lastGuessResult.playerName} has ${lastGuessResult.card}.`
                            : `✗ Incorrect! ${lastGuessResult?.playerName} guessed ${lastGuessResult?.card}, but their card was ${
                                room.players.find(
                                  (p) => p.name === lastGuessResult?.playerName,
                                )?.card
                              }.`}
                        </div>
                        <p className="mt-2 text-center text-xs text-slate-500">
                          Next player loading...
                        </p>
                      </div>
                    ) : isMyTurn ? (
                      <div className="mt-3">
                        {room.phase === "ranking" ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Array.from(
                              { length: room.players.length },
                              (_, index) => index + 1,
                            ).map((rank) => (
                              <button
                                key={rank}
                                onClick={() => submitRanking(rank)}
                                className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-left font-medium"
                              >
                                <div>{formatRank(rank)}</div>
                                <div className="text-xs text-slate-500">
                                  {rank - 1} above ·{" "}
                                  {room.players.length - rank} below
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {guessingCards.map((card) => (
                                <button
                                  key={card}
                                  onClick={() => setPendingGuess(card)}
                                  className={`rounded-2xl border px-3 py-2 text-sm font-medium ${
                                    pendingGuess === card
                                      ? "border-amber-400 bg-amber-100 text-amber-800"
                                      : "border-slate-300 bg-white text-slate-700"
                                  }`}
                                >
                                  {card}
                                </button>
                              ))}
                            </div>
                            {pendingGuess && (
                              <button
                                onClick={() => submitGuess(pendingGuess)}
                                className="rounded-2xl bg-slate-900 px-4 py-2 font-semibold text-white"
                              >
                                Confirm guess: {pendingGuess}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        Waiting for{" "}
                        {currentPlayer?.name ?? "the current player"}.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3">
                    {visiblePlayers.map((player) => {
                      const isCurrent = currentPlayer?.id === player.id;
                      const actualPlayer = room?.players.find((p) => p.id === player.id);
                      const hasGuessed = player.guess !== null && player.guess !== undefined;
                      const guessCorrect = hasGuessed && player.guess === actualPlayer?.card;

                      let borderClass = "border-slate-200 bg-white";
                      if (guessCorrect) {
                        borderClass = "border-emerald-400 bg-emerald-50";
                      } else if (hasGuessed && !guessCorrect) {
                        borderClass = "border-rose-400 bg-rose-50";
                      } else if (isCurrent) {
                        borderClass = "border-amber-400 bg-amber-50";
                      }

                      return (
                        <div
                          key={player.id}
                          className={`rounded-2xl border p-3 ${borderClass}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{player.name}</p>
                              <p className="text-sm text-slate-500">
                                {player.id === playerId
                                  ? "Your hidden card"
                                  : `Card: ${player.card ?? "—"}`}
                              </p>
                            </div>
                            <div className="text-right text-sm text-slate-600">
                              <div>
                                Rank:{" "}
                                {player.ranking
                                  ? formatRank(player.ranking)
                                  : "—"}
                              </div>
                              <div>
                                Eliminated:{" "}
                                {player.eliminatedGuesses.join(", ") || "none"}
                              </div>
                            </div>
                          </div>
                          {player.id === playerId ? (
                            <div className="mt-2 text-sm text-slate-500">
                              Your card remains hidden from everyone else.
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Start new game button for host */}
            {room?.hostId === playerId && room.phase !== "lobby" && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={startNextGame}
                  className="rounded-2xl bg-amber-500 px-6 py-2 font-semibold text-white"
                >
                  Start new game
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
