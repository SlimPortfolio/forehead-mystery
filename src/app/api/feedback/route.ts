import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { containsProfanity, PROFANITY_REJECTION } from "@/lib/profanity";
import { validateFeedback } from "@/lib/feedback";

/**
 * Public submission endpoint for the /feedback form. Anonymous by design — no
 * Clerk session is required, since players shouldn't have to make an account
 * to report a bug. Reading these back is admin-only (/api/admin/feedback).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Same validator the form runs client-side, re-run here so a hand-rolled
    // POST can't skip the length caps.
    const { value, errors } = validateFeedback(body);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // The subject and name surface in the admin list; keep them clean the same
    // way room chat is kept clean. The description is deliberately exempt —
    // someone venting about a bug shouldn't have their report silently
    // rejected, and only the dev team ever reads it.
    if (containsProfanity(value.subject) || containsProfanity(value.name)) {
      return NextResponse.json({ error: PROFANITY_REJECTION }, { status: 400 });
    }

    const record = {
      ...value,
      status: "new" as const,
      createdAt: new Date(),
    };

    const db = await getMongoDb();
    const result = await db.collection("feedback").insertOne(record);

    // Echoes back only the id: the client has everything else it submitted,
    // and there is nothing here worth returning to an anonymous caller.
    return NextResponse.json(
      { id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[feedback POST] failed to save feedback", { error: message });
    return NextResponse.json(
      {
        error: "Failed to send feedback",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
