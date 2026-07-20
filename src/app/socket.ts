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
    socket.on(
      "join-room",
      (roomCode: string, playerName: string, playerId: string) => {
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.playerName = playerName;
        socket.data.playerId = playerId;
        socket
          .to(roomCode)
          .emit("player-joined", { roomCode, playerName, playerId });
      },
    );

    socket.on("room-update", (room) => {
      if (!socket.data.roomCode) return;
      socket.to(socket.data.roomCode).emit("room-state", room);
    });

    socket.on("disconnect", () => {
      if (!socket.data.roomCode) return;
      socket.to(socket.data.roomCode).emit("player-left", {
        roomCode: socket.data.roomCode,
        playerId: socket.data.playerId,
      });
    });
  });

  return io;
}
