import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "forehead-mystery";

let cachedClient: MongoClient | null = null;

export async function getMongoClient() {
  console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
  console.log("URI starts with:", process.env.MONGODB_URI?.slice(0, 20));
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (cachedClient) return cachedClient;

  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

// A room with no activity (no PATCH touching `updatedAt`) for this long is
// considered abandoned. MongoDB's TTL background monitor sweeps expired
// documents on its own — no app-side cron or startup hook required.
const ROOM_INACTIVITY_TTL_SECONDS = 10 * 60;

let indexesReady: Promise<void> | null = null;

function ensureIndexes(db: Awaited<ReturnType<MongoClient["db"]>>) {
  if (!indexesReady) {
    indexesReady = db
      .collection("rooms")
      .createIndex(
        { updatedAt: 1 },
        { expireAfterSeconds: ROOM_INACTIVITY_TTL_SECONDS },
      )
      .then(() => undefined)
      .catch((error) => {
        // Don't let a failed index call wedge every future request; the
        // room APIs still work without the TTL index, just without cleanup.
        indexesReady = null;
        console.error("[mongodb] failed to ensure rooms TTL index", error);
      });
  }
  return indexesReady;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}
