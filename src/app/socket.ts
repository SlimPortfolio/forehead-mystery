import { Server } from "socket.io";

export default function initSocket(server: any) {
  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);

    socket.on(
      "join-room",
      (roomCode: string, playerName: string, playerId: string) => {
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = playerName;
        socket.data.playerId = playerId;
        console.log(`${playerName} joined room ${roomCode}`);
        io.to(roomCode).emit("player-joined", {
          roomCode,
          playerName,
          playerId,
        });
      },
    );

    socket.on("room-update", (room) => {
      if (!socket.data.roomCode) return;
      console.log(`Room update in ${socket.data.roomCode}:`, room.phase);
      io.to(socket.data.roomCode).emit("room-state", room);
    });

    socket.on("disconnect", () => {
      if (!socket.data.roomCode) return;
      console.log(
        `${socket.data.playerName} disconnected from ${socket.data.roomCode}`,
      );
      io.to(socket.data.roomCode).emit("player-left", {
        roomCode: socket.data.roomCode,
        playerId: socket.data.playerId,
      });
    });
  });

  return io;
}
