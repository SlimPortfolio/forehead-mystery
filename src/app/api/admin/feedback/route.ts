import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/admin";
import { isFeedbackStatus } from "@/lib/feedback";
import { listFeedback } from "@/lib/feedbackDb";

/** Never prerender or cache: the response contains players' contact details. */
export const dynamic = "force-dynamic";

/**
 * Lists feedback submissions, newest first.
 *
 * Gated on the allowlist independently of the /admin page's own check — an API
 * route is directly reachable, so it must never assume a page-level guard ran.
 * Unauthorized callers get a bare 404 rather than a 403, so this endpoint's
 * existence isn't confirmed to anyone who isn't already an admin.
 */
export async function GET(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // An unrecognized ?status is ignored rather than rejected — the dashboard
    // treats "no filter" as the default view.
    const statusParam = new URL(request.url).searchParams.get("status");
    const status = isFeedbackStatus(statusParam) ? statusParam : undefined;

    const feedback = await listFeedback(status);

    return NextResponse.json(
      { feedback },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin feedback GET] failed to load feedback", {
      error: message,
    });
    return NextResponse.json(
      { error: "Failed to load feedback" },
      { status: 500 },
    );
  }
}
