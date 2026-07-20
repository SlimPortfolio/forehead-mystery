"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

type CardState = "possible" | "impossible" | "most-likely";
type GamePhase = "lobby" | "ranking" | "guessing" | "finished";

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

const CARD_POOL = ["A", "2", "3", "4", "5", "6", "7", "8"];
const STORAGE_PREFIX = "forehead-mystery-room";
const PLAYER_ID_KEY = "forehead-mystery-player-id";
const appUrl = (
  (process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000")) as string
).replace(/\/$/, "");
const socketUrl = (
  (process.env.NEXT_PUBLIC_SOCKET_URL || appUrl) as string
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
  const [socket, setSocket] = useState<Socket | null>(null);

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

  useEffect(() => {
    if (!playerId) return;

    const client = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
    });

    client.on("connect", () => {
      if (roomCode) {
        client.emit("join-room", roomCode, playerName || "Guest", playerId);
      }
    });

    client.on("room-state", (nextRoom: Room) => {
      setRoom(nextRoom);
      setJoined(true);
      setStatus(`Updated room ${nextRoom.id}`);
    });

    client.on("player-joined", ({ roomCode: joinedRoomCode }) => {
      if (joinedRoomCode === roomCode) {
        setStatus(`A player joined room ${joinedRoomCode}`);
      }
    });

    setSocket(client);

    return () => {
      client.disconnect();
    };
  }, [playerId, roomCode, playerName]);

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
  }, [room, playerId]);

  useEffect(() => {
    if (!room || !playerId || typeof window === "undefined") return;
    window.localStorage.setItem(
      `${STORAGE_PREFIX}:${room.id}:${playerId}`,
      JSON.stringify(scratchpad),
    );
  }, [room, playerId, scratchpad]);

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
    if (socket) {
      socket.emit("room-update", nextRoom);
    }

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

  const startGame = () => {
    if (!room || !myPlayer || !room.players.length) return;
    if (room.players.length < 4 || room.players.length > 8) {
      setStatus("A game needs between 4 and 8 players to begin.");
      return;
    }
    if (room.hostId !== playerId) {
      setStatus("Only the host can begin the game.");
      return;
    }

    const shuffledCards = shuffle(CARD_POOL.slice(0, room.players.length));
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
      turnOrder: nextPlayers.map((player) => player.id),
    };

    submitRoomState(nextRoom);
    setStatus("The game has started. Submit your ranking.");
  };

  const submitRanking = (rank: number) => {
    if (!room || !myPlayer || !isMyTurn) return;

    const nextPlayers = room.players.map((player) =>
      player.id === myPlayer.id ? { ...player, ranking: rank } : player,
    );

    const nextTurnIndex = room.currentTurnIndex + 1;
    const nextRoom: Room = {
      ...room,
      players: nextPlayers,
      currentTurnIndex:
        nextTurnIndex >= room.turnOrder.length ? 0 : nextTurnIndex,
      phase: nextTurnIndex >= room.turnOrder.length ? "guessing" : "ranking",
    };

    submitRoomState(nextRoom);
    setPendingGuess(null);
    setStatus(`You ranked ${formatRank(rank)}. Waiting for the next player.`);
  };

  const submitGuess = (card: string) => {
    if (!room || !myPlayer || !isMyTurn || room.phase !== "guessing") return;
    if (!pendingGuess) {
      setPendingGuess(card);
      setStatus(`Confirm ${card} as your guess.`);
      return;
    }

    const nextPlayers = room.players.map((player) => {
      if (player.id !== myPlayer.id) return player;
      const wasCorrect = player.card === pendingGuess;
      const nextEliminated = wasCorrect
        ? player.eliminatedGuesses
        : [...player.eliminatedGuesses, pendingGuess];
      return {
        ...player,
        guess: pendingGuess,
        eliminatedGuesses: nextEliminated,
        isCorrectlyIdentified: wasCorrect || player.isCorrectlyIdentified,
      };
    });

    const nextTurnIndex = room.currentTurnIndex + 1;
    const nextRoom: Room = {
      ...room,
      players: nextPlayers,
      currentTurnIndex:
        nextTurnIndex >= room.turnOrder.length ? 0 : nextTurnIndex,
    };

    const allSolved = nextPlayers.every(
      (player) => player.isCorrectlyIdentified,
    );
    if (allSolved) {
      nextRoom.phase = "finished";
      setStatus("Every player solved the mystery. The game is over.");
    } else if (nextTurnIndex >= room.turnOrder.length) {
      nextRoom.phase = "ranking";
      nextRoom.round += 1;
      nextRoom.currentTurnIndex = 0;
      nextRoom.players = nextPlayers.map((player) => ({
        ...player,
        ranking: null,
        guess: null,
      }));
      setStatus(
        `Round ${nextRoom.round} has started. Submit your new ranking.`,
      );
    } else {
      setStatus(`Your guess is locked. Waiting for the next player.`);
    }

    submitRoomState(nextRoom);
    setPendingGuess(null);
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
                    <button
                      onClick={startGame}
                      className="rounded-2xl bg-amber-500 px-4 py-2 font-semibold text-white"
                    >
                      Start game
                    </button>
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {visibleCards.map((card) => (
                    <button
                      key={card}
                      onClick={() => toggleScratchpad(card)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-medium ${
                        scratchpad[card] === "most-likely"
                          ? "border-amber-400 bg-amber-100 text-amber-800"
                          : scratchpad[card] === "impossible"
                            ? "border-rose-300 bg-rose-50 text-rose-700"
                            : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {card} · {scratchpad[card] ?? "Possible"}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Mark cards as possible, impossible, or most likely. These
                  notes stay on your device.
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
                        : "Choose the card you believe you hold. Confirm before locking it in."}
                    </p>
                    {isMyTurn ? (
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
                              {visibleCards.map((card) => (
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
                      return (
                        <div
                          key={player.id}
                          className={`rounded-2xl border p-3 ${isCurrent ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}
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
          </div>
        ) : null}
      </div>
    </main>
  );
}
