// Standalone CLI for entering a winner directly into the "winners"
// collection, geocoding its location the same way the app's POST
// /api/winners route does (see src/lib/geocode.ts).
//
// Usage:
//   node --env-file=.env.local --experimental-strip-types scripts/add-winner.ts '<json>'
//
// <json> shape:
//   {"teamName":"...","date":"YYYY-MM-DD","time":"HH:MM","location":"City, Region",
//    "players":[{"name":"...","card":"..."}]}
import { MongoClient } from "mongodb";
import { geocodeLocation } from "../src/lib/geocode.ts";

type PlayerInput = { name?: unknown; card?: unknown };
type WinnerInput = {
  teamName?: unknown;
  date?: unknown;
  time?: unknown;
  location?: unknown;
  players?: PlayerInput[];
};

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error(
      "Usage: node --env-file=.env.local --experimental-strip-types scripts/add-winner.ts '<json>'",
    );
    process.exit(1);
  }

  const input = JSON.parse(raw) as WinnerInput;

  const teamName = String(input.teamName ?? "").trim();
  const date = String(input.date ?? "").trim();
  const time = String(input.time ?? "").trim();
  const location = String(input.location ?? "").trim();
  const players = (input.players ?? [])
    .map((player) => ({
      name: String(player?.name ?? "").trim(),
      card: String(player?.card ?? "").trim(),
    }))
    .filter((player) => player.name && player.card);

  if (!teamName || !date || !time || !location || players.length === 0) {
    console.error(
      "teamName, date, time, location, and at least one player+card are required",
    );
    process.exit(1);
  }

  const { lat, lng } = await geocodeLocation(location);
  if (lat === null || lng === null) {
    console.warn(`Could not geocode "${location}" — saving with null coordinates`);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set");
  const dbName = process.env.MONGODB_DB || "forehead-mystery";

  const client = new MongoClient(uri);
  try {
    await client.connect();
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
    const result = await client.db(dbName).collection("winners").insertOne(record);
    console.log(
      JSON.stringify({ id: result.insertedId.toString(), ...record }, null, 2),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
