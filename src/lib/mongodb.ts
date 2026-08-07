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
const ROOM_INACTIVITY_TTL_SECONDS = 2 * 60 * 60;

let indexesReady: Promise<void> | null = null;

async function createOrUpdateTtlIndex(db: Awaited<ReturnType<MongoClient["db"]>>) {
  try {
    await db
      .collection("rooms")
      .createIndex(
        { updatedAt: 1 },
        { expireAfterSeconds: ROOM_INACTIVITY_TTL_SECONDS },
      );
  } catch (error: any) {
    // The index already exists with a different expireAfterSeconds (e.g. an
    // earlier deploy used a different TTL). createIndex refuses to redefine
    // it in place, so reconcile via collMod instead of leaving the stale
    // value in effect.
    if (error?.codeName === "IndexOptionsConflict" || error?.code === 85) {
      await db.command({
        collMod: "rooms",
        index: {
          keyPattern: { updatedAt: 1 },
          expireAfterSeconds: ROOM_INACTIVITY_TTL_SECONDS,
        },
      });
      return;
    }
    throw error;
  }
}

/** Backs the /admin dashboard's "open vs resolved, newest first" query. Unlike
 * the rooms index this is a plain compound index — feedback is never swept, it
 * has to stay readable for as long as the dev team cares about it. */
async function createFeedbackIndex(db: Awaited<ReturnType<MongoClient["db"]>>) {
  await db.collection("feedback").createIndex({ status: 1, createdAt: -1 });
}

function ensureIndexes(db: Awaited<ReturnType<MongoClient["db"]>>) {
  if (!indexesReady) {
    indexesReady = Promise.all([
      createOrUpdateTtlIndex(db),
      createFeedbackIndex(db),
    ])
      .then(() => undefined)
      .catch((error) => {
        // Don't let a failed index call wedge every future request; the room
        // and feedback APIs still work without their indexes, just without
        // TTL cleanup / with slower admin queries.
        indexesReady = null;
        console.error("[mongodb] failed to ensure indexes", error);
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
