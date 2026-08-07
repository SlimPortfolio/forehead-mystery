import type { Metadata } from "next";
import WinnersHeader from "@/components/game/WinnersHeader";
import AccountButton from "@/components/admin/AccountButton";
import AdminGate from "@/components/admin/AdminGate";
import FeedbackBoard from "@/components/admin/FeedbackBoard";
import { getAdminIdentity, isSignedIn } from "@/lib/admin";
import { listFeedback } from "@/lib/feedbackDb";

/** Feedback contains players' contact details, so this page must be rendered
 * per-request and never cached or prerendered at build time. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Forehead Mystery",
  // Belt and braces alongside the auth gate: keep the route out of search
  // results even if a URL leaks.
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const admin = await getAdminIdentity();

  // The feedback query only runs after the allowlist check passes, so an
  // unauthorized request never loads the data at all — there's nothing in the
  // RSC payload to leak.
  const feedback = admin ? await listFeedback() : [];

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)] text-ink">
      <WinnersHeader>{admin && <AccountButton />}</WinnersHeader>
      <div className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col gap-3">
        <section className="flex-1 min-h-0 space-y-6 overflow-y-auto border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          {admin ? (
            <>
              <div>
                <h1 className="text-3xl font-semibold">Feedback</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Everything players have sent through the feedback form. Change
                  a status to move an item between sections.
                </p>
              </div>
              <FeedbackBoard initialFeedback={feedback} />
            </>
          ) : (
            <AdminGate signedIn={await isSignedIn()} />
          )}
        </section>
      </div>
    </main>
  );
}
