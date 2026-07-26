import { getMongoDb } from "@/lib/mongodb";
import type { GameMetricRecord } from "@/lib/metrics";
import WinnersHeader from "@/components/game/WinnersHeader";

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

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
}

function winRate(games: GameMetricRecord[]): number {
  if (games.length === 0) return 0;
  const wins = games.filter((game) => game.gameWon).length;
  return Math.round((wins / games.length) * 100 * 100) / 100;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default async function DataPage() {
  const metrics = await getMetrics();

  const totalGames = metrics.length;
  const highEloGames = metrics.filter((game) => game.highEloMatch);
  const normalGames = metrics.filter((game) => !game.highEloMatch);

  const avgCorrectGuess = average(
    metrics.map((game) => game.percentCorrectGuess),
  );
  const avgCorrectRank = average(
    metrics.map((game) => game.percentOfCorrectRank),
  );

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)] text-ink">
      <WinnersHeader />
      <div className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col gap-3">
        <section className="flex-1 min-h-0 space-y-6 overflow-y-auto border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-3xl font-semibold">Game Data</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Metrics harvested from every completed game (bot games excluded).
            </p>
          </div>

          {totalGames === 0 ? (
            <p className="text-sm text-slate-500">
              No games have been logged yet. Play a game to the end to start
              collecting data.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total games" value={String(totalGames)} />
                <StatCard label="Win rate" value={`${winRate(metrics)}%`} />
                <StatCard
                  label="Avg correct guess"
                  value={`${avgCorrectGuess}%`}
                />
                <StatCard
                  label="Avg correct rank"
                  value={`${avgCorrectRank}%`}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="High Elo games"
                  value={String(highEloGames.length)}
                  sub={`${winRate(highEloGames)}% win rate`}
                />
                <StatCard
                  label="Normal games"
                  value={String(normalGames.length)}
                  sub={`${winRate(normalGames)}% win rate`}
                />
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Recent games</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-4">When</th>
                        <th className="py-2 pr-4">Players</th>
                        <th className="py-2 pr-4">Result</th>
                        <th className="py-2 pr-4">Correct guesses</th>
                        <th className="py-2 pr-4">Correct ranks</th>
                        <th className="py-2 pr-4">Elo</th>
                        <th className="py-2 pr-4">Cards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((game) => (
                        <tr
                          key={game.id}
                          className="border-b border-slate-100 align-top"
                        >
                          <td className="py-3 pr-4 text-slate-600">
                            {game.createdAt
                              ? new Date(game.createdAt).toLocaleString()
                              : "—"}
                          </td>
                          <td className="py-3 pr-4 text-slate-600">
                            {game.numberOfPlayers}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                game.gameWon
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {game.gameWon ? "Won" : "Lost"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-600">
                            {game.numberOfCorrectGuess}/{game.numberOfPlayers} (
                            {game.percentCorrectGuess}%)
                          </td>
                          <td className="py-3 pr-4 text-slate-600">
                            {game.numberOfCorrectRank}/{game.numberOfPlayers} (
                            {game.percentOfCorrectRank}%)
                          </td>
                          <td className="py-3 pr-4">
                            {game.highEloMatch ? (
                              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                                High
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1.5">
                              {game.cardCombination.map((card, index) => (
                                <span
                                  key={`${game.id}-${index}`}
                                  className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                                >
                                  {card}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
