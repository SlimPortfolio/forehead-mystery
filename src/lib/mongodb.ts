import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "forehead-mystery";

if (!uri) {
  throw new Error("MONGODB_URI environment variable is not set");
}

const mongoUri = uri as string;

let cachedClient: MongoClient | null = null;

export async function getMongoClient() {
  if (cachedClient) return cachedClient;

  cachedClient = new MongoClient(mongoUri);
  await cachedClient.connect();
  return cachedClient;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db(dbName);
}
