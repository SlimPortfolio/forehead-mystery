import type { Metadata } from "next";
import WinnersHeader from "@/components/game/WinnersHeader";
import FeedbackForm from "@/components/feedback/FeedbackForm";

export const metadata: Metadata = {
  title: "Send Feedback — Forehead Mystery",
  description: "Report a bug or send an idea to the Forehead Mystery dev team.",
};

export default function FeedbackPage() {
  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)] text-ink">
      <WinnersHeader />
      <div className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col gap-3">
        <section className="flex-1 min-h-0 space-y-6 overflow-y-auto border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-3xl font-semibold">Send Feedback</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Found a bug, or got an idea that would make the game better? Tell
              us about it — it goes straight to the dev team.
            </p>
          </div>

          <FeedbackForm />
        </section>
      </div>
    </main>
  );
}
