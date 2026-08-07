import "server-only";
import { ObjectId, type Document, type WithId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import {
  isFeedbackStatus,
  type FeedbackRecord,
  type FeedbackStatus,
} from "@/lib/feedback";

/**
 * Server-side reads and writes for the `feedback` collection.
 *
 * Kept out of `feedback.ts` (which the browser bundles for form validation) so
 * no Mongo import ever reaches the client, and shared by the /admin page and
 * the admin API so the two can't drift on field names or defaults.
 *
 * Nothing in here does an authorization check — every caller must gate on
 * `getAdminIdentity()` first.
 */

/** Mongo dates may be `Date` or (on legacy/hand-edited docs) a string; both
 * normalize to an ISO string the client can format. */
function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function toFeedbackRecord(doc: WithId<Document>): FeedbackRecord {
  // Records written before triage existed have no status; they're untouched,
  // which is exactly what "new" means.
  const status: FeedbackStatus = isFeedbackStatus(doc.status)
    ? doc.status
    : "new";

  return {
    id: doc._id.toString(),
    subject: String(doc.subject ?? ""),
    description: String(doc.description ?? ""),
    name: String(doc.name ?? ""),
    contact: String(doc.contact ?? ""),
    status,
    createdAt: toIsoString(doc.createdAt),
    ...(doc.statusUpdatedAt
      ? { statusUpdatedAt: toIsoString(doc.statusUpdatedAt) }
      : {}),
    ...(doc.statusUpdatedBy
      ? { statusUpdatedBy: String(doc.statusUpdatedBy) }
      : {}),
  };
}

/** Newest first. Passing a status narrows the query; omitting it returns
 * everything, which is what the dashboard loads so it can split the list into
 * sections client-side without a second round trip. */
export async function listFeedback(
  status?: FeedbackStatus,
): Promise<FeedbackRecord[]> {
  const db = await getMongoDb();
  const docs = await db
    .collection("feedback")
    .find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(toFeedbackRecord);
}

/** Returns the updated record, or `null` when `id` is malformed or matches no
 * document — callers surface both as a 404. */
export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  updatedBy: string,
): Promise<FeedbackRecord | null> {
  if (!ObjectId.isValid(id)) return null;

  const db = await getMongoDb();
  const doc = await db.collection("feedback").findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: updatedBy,
      },
    },
    { returnDocument: "after" },
  );

  return doc ? toFeedbackRecord(doc) : null;
}
