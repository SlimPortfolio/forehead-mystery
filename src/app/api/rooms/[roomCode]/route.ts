import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await params;
    const body = await request.json();
    const db = await getMongoDb();
    const rooms = db.collection<any>("rooms");

    const update = {
      ...body,
      updatedAt: new Date(),
    };

    const normalizedRoomCode = roomCode.toUpperCase();
    const result = await rooms.findOneAndUpdate(
      { _id: normalizedRoomCode },
      { $set: update },
      { returnDocument: "after", upsert: true },
    );

    return NextResponse.json({ room: result.value }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 },
    );
  }
}
