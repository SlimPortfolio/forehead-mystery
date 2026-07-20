import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

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

    const update = {
      ...body,
      updatedAt: new Date(),
    };

    const result = await rooms.findOneAndUpdate(
      { _id: normalizedRoomCode },
      { $set: update },
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
