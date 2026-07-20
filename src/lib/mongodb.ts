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

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db(dbName);
}
