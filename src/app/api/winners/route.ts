import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { geocodeLocation } from "@/lib/geocode";

type WinnerPlayerCardInput = {
  name: unknown;
  card: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const teamName = String(body?.teamName || "").trim();
    const date = String(body?.date || "").trim();
    const time = String(body?.time || "").trim();
    const location = String(body?.location || "").trim();
    const suit = String(body?.suit || "").trim();
    const special = Boolean(body?.special);
    const rawPlayers = Array.isArray(body?.players) ? body.players : [];

    if (!teamName || !date || !time || !location) {
      return NextResponse.json(
        { error: "teamName, date, time, and location are required" },
        { status: 400 },
      );
    }

    const players = (rawPlayers as WinnerPlayerCardInput[])
      .map((player) => ({
        name: String(player?.name || "").trim(),
        card: String(player?.card || "").trim(),
      }))
      .filter((player) => player.name && player.card);

    if (players.length === 0) {
      return NextResponse.json(
        { error: "At least one player with a card is required" },
        { status: 400 },
      );
    }

    const { lat, lng } = await geocodeLocation(location);

    const db = await getMongoDb();
    const winners = db.collection("winners");

    const record = {
      teamName,
      date,
      time,
      location,
      lat,
      lng,
      players,
      // Only persist a suit when one was actually supplied; likewise keep the
      // special flag off unless explicitly set, so legacy/unknown games stay clean.
      ...(suit ? { suit } : {}),
      ...(special ? { special: true } : {}),
      createdAt: new Date(),
    };

    const result = await winners.insertOne(record);

    return NextResponse.json(
      { winner: { ...record, id: result.insertedId.toString() } },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[winners POST] failed to save winner", { error: message });
    return NextResponse.json(
      {
        error: "Failed to save winner",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
