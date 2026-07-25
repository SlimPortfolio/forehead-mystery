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

// A room can never hold more than this many players (humans + bots).
const MAX_ROOM_PLAYERS = 8;

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

    // Scoped, atomic player join. A joining client sends ONLY this — never the
    // full room — so a join can't clobber a move another player is submitting
    // at the same instant. The conditional filter appends the player only if
    // (a) they're not already in the room (no duplicate on a double-submit)
    // and (b) the room isn't already full — the $size guard makes the 8-player
    // cap hold even if two players race for the last seat. When the append is
    // rejected we return the current room so the client can see whether it
    // actually made it in.
    if ("playerJoin" in body) {
      const newPlayer = body.playerJoin;
      const joinId =
        newPlayer && typeof newPlayer === "object"
          ? (newPlayer as Record<string, unknown>).id
          : undefined;
      if (typeof joinId !== "string") {
        return NextResponse.json({ error: "Invalid player" }, { status: 400 });
      }

      // In driver v7, findOneAndUpdate returns the document directly (or null),
      // not a { value } wrapper.
      const appended = await rooms.findOneAndUpdate(
        {
          _id: normalizedRoomCode,
          "players.id": { $ne: joinId },
          $expr: { $lt: [{ $size: "$players" }, MAX_ROOM_PLAYERS] },
        },
        { $push: { players: newPlayer }, $set: { updatedAt: new Date() } },
        { returnDocument: "after" },
      );

      if (appended) {
        return NextResponse.json({ room: appended }, { status: 200 });
      }

      // Append didn't happen (already in the room, or the room is full).
      // Hand back the current state so the client can tell which it was.
      const current = await rooms.findOne({ _id: normalizedRoomCode });
      return NextResponse.json({ room: current }, { status: 200 });
    }

    // Scoped, atomic player removal ($pull by id). Used to remove a player
    // who isn't part of the active game (a spectator waiting for the next
    // game, whether they left on their own or the host kicked them). Because
    // it only pulls one id and touches nothing else, it can't clobber a move
    // another player is submitting at the same instant. Removing an *active*
    // player is NOT done this way — that path (see the client) also ends the
    // game and rewrites turn order, so it goes through a normal full write.
    if ("playerRemove" in body) {
      const removeId = body.playerRemove;
      if (typeof removeId !== "string") {
        return NextResponse.json({ error: "Invalid player" }, { status: 400 });
      }
      const removeUpdate = {
        $pull: { players: { id: removeId } },
        $set: { updatedAt: new Date() },
      } as Record<string, unknown>;
      const updated = await rooms.findOneAndUpdate(
        { _id: normalizedRoomCode },
        removeUpdate,
        { returnDocument: "after" },
      );
      return NextResponse.json({ room: updated }, { status: 200 });
    }

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
