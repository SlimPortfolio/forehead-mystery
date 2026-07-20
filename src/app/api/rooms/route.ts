import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roomCode = String(body?.roomCode || "")
      .trim()
      .toUpperCase();
    const hostName = String(body?.hostName || "Player").trim();

    if (!roomCode || !/^[A-Z0-9]{3,6}$/.test(roomCode)) {
      return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
    }

    const db = await getMongoDb();
    const rooms = db.collection<any>("rooms");
    const existing = await rooms.findOne({ _id: roomCode });

    if (existing) {
      return NextResponse.json({ room: existing }, { status: 200 });
    }

    const room = {
      _id: roomCode,
      id: roomCode,
      hostId: "",
      players: [
        {
          id: `host-${Math.random().toString(36).slice(2, 8)}`,
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
      turnOrder: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await rooms.insertOne(room);
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get("roomCode")?.trim().toUpperCase();

    if (!roomCode) {
      return NextResponse.json({ error: "Missing roomCode" }, { status: 400 });
    }

    const db = await getMongoDb();
    const room = await db.collection<any>("rooms").findOne({ _id: roomCode });

    return NextResponse.json({ room }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 },
    );
  }
}
