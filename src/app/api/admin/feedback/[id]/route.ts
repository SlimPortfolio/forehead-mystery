import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/admin";
import { isFeedbackStatus } from "@/lib/feedback";
import { updateFeedbackStatus } from "@/lib/feedbackDb";

export const dynamic = "force-dynamic";

/**
 * Moves one submission to a new status. Records which admin made the change so
 * a shared inbox has an audit trail.
 *
 * Re-checks the allowlist itself rather than trusting the /admin page's guard,
 * and answers 404 (not 403) to non-admins for the same reason as the list
 * endpoint.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminIdentity();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const status = body?.status;

    if (!isFeedbackStatus(status)) {
      return NextResponse.json(
        { error: "A valid status is required" },
        { status: 400 },
      );
    }

    const feedback = await updateFeedbackStatus(id, status, admin.userId);
    if (!feedback) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      { feedback },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin feedback PATCH] failed to update status", {
      id,
      error: message,
    });
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
