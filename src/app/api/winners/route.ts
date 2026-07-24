import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

type WinnerPlayerCardInput = {
  name: unknown;
  card: unknown;
};

/**
 * Looks up coordinates for a "City, Region" string via OpenStreetMap's
 * Nominatim geocoder. Only called once per saved winner (not on page load),
 * which keeps us well within Nominatim's usage policy. Returns nulls on any
 * failure so a bad/ambiguous location never blocks saving the win.
 */
async function geocodeLocation(
  location: string,
): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      location,
    )}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "forehead-mystery/1.0 (winners map geocoding)",
      },
    });
    if (!response.ok) return { lat: null, lng: null };

    const results = await response.json();
    const first = Array.isArray(results) ? results[0] : null;
    if (!first) return { lat: null, lng: null };

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { lat: null, lng: null };
    }
    return { lat, lng };
  } catch (error) {
    console.error("[winners POST] geocoding failed", { error, location });
    return { lat: null, lng: null };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const teamName = String(body?.teamName || "").trim();
    const date = String(body?.date || "").trim();
    const time = String(body?.time || "").trim();
    const location = String(body?.location || "").trim();
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
