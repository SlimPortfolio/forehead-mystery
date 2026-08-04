import { getMongoDb } from "@/lib/mongodb";
import type { GameMetricRecord } from "@/lib/metrics";
import WinnersHeader from "@/components/game/WinnersHeader";
import MetricsDashboard from "@/components/game/MetricsDashboard";

export const dynamic = "force-dynamic";

async function getMetrics(): Promise<GameMetricRecord[]> {
  const db = await getMongoDb();
  const docs = await db
    .collection("metrics")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    gameWon: Boolean(doc.gameWon),
    numberOfPlayers: Number(doc.numberOfPlayers ?? 0),
    numberOfCorrectGuess: Number(doc.numberOfCorrectGuess ?? 0),
    percentCorrectGuess: Number(doc.percentCorrectGuess ?? 0),
    numberOfCorrectRank: Number(doc.numberOfCorrectRank ?? 0),
    percentOfCorrectRank: Number(doc.percentOfCorrectRank ?? 0),
    highEloMatch: Boolean(doc.highEloMatch),
    // Absent on records written before bot games were tracked — those are all
    // human games, so the `undefined -> false` default is correct.
    botGame: Boolean(doc.botGame),
    cardCombination: Array.isArray(doc.cardCombination)
      ? doc.cardCombination.map((card: unknown) => String(card))
      : [],
    // Logged for later analysis only — deliberately not rendered below.
    playerCards: Array.isArray(doc.playerCards)
      ? doc.playerCards.map((entry: Record<string, unknown>) => ({
          name: String(entry?.name || ""),
          card: String(entry?.card || ""),
        }))
      : [],
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  }));
}

export default async function DataPage() {
  const metrics = await getMetrics();

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)] text-ink">
      <WinnersHeader />
      <div className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col gap-3">
        <section className="flex-1 min-h-0 space-y-6 overflow-y-auto border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-3xl font-semibold">Game Data</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Data and trends gathered from completed games
            </p>
          </div>

          {metrics.length === 0 ? (
            <p className="text-sm text-slate-500">
              No games have been logged yet. Play a game to the end to start
              collecting data.
            </p>
          ) : (
            <MetricsDashboard metrics={metrics} />
          )}
        </section>
      </div>
    </main>
  );
}
