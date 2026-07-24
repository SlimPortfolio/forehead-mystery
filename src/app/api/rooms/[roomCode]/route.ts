import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

// Fields a client is allowed to write on a room. Anything else in the PATCH
// body is dropped so a stray/malicious key can't set arbitrary database
// fields. `chatMessages.<playerId>` dotted paths are also permitted (see
// `isAllowedKey`) so an emote can scope its write to a single player's slot
// and never clobber a concurrent move.
const ALLOWED_ROOM_FIELDS = new Set([
  "id",
  "hostId",
  "players",
  "phase",
  "round",
  "currentTurnIndex",
  "turnOrder",
  "gameNumber",
  "chatMessages",
]);

function isAllowedKey(key: string): boolean {
  if (ALLOWED_ROOM_FIELDS.has(key)) return true;
  // Scoped emote write, e.g. "chatMessages.abc123".
  return /^chatMessages\.[^.]+$/.test(key);
}

// Cap how many postgame chat messages a room retains, so the array can't
// grow unbounded across a long-running room.
const POST_GAME_CHAT_LIMIT = 200;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  const { roomCode } = await params;
  const normalizedRoomCode = roomCode.toUpperCase();

  try {
    const body = await request.json();
    const db = await getMongoDb();
    const rooms = db.collection<any>("rooms");

    const setUpdate: Record<string, unknown> = { updatedAt: new Date() };
    let pushMessage: unknown = undefined;
    for (const [key, value] of Object.entries(body)) {
      // Postgame chat is append-only: pushed via $push instead of $set so two
      // players sending a message in the same instant can't overwrite each
      // other's message (which a whole-array $set would risk).
      if (key === "postGameChatAppend") {
        pushMessage = value;
        continue;
      }
      if (isAllowedKey(key)) setUpdate[key] = value;
    }

    const mongoUpdate: Record<string, unknown> = { $set: setUpdate };
    if (pushMessage !== undefined) {
      mongoUpdate.$push = {
        postGameChat: {
          $each: [pushMessage],
          $slice: -POST_GAME_CHAT_LIMIT,
        },
      };
    }

    const result = await rooms.findOneAndUpdate(
      { _id: normalizedRoomCode },
      mongoUpdate,
      { returnDocument: "after", upsert: true },
    );

    return NextResponse.json({ room: result.value }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[rooms PATCH] update room failed", {
      roomCode: normalizedRoomCode,
      error: message,
    });
    return NextResponse.json(
      {
        error: "Failed to update room",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
