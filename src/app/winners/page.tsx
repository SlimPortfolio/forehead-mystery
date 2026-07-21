import { getMongoDb } from "@/lib/mongodb";
import type { WinnerRecord } from "@/lib/winners";

export const dynamic = "force-dynamic";

async function getWinners(): Promise<WinnerRecord[]> {
  const db = await getMongoDb();
  const docs = await db
    .collection("winners")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    teamName: doc.teamName,
    date: doc.date,
    time: doc.time,
    location: doc.location,
    players: doc.players ?? [],
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  }));
}

export default async function WinnersPage() {
  const winners = await getWinners();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,#fdf2f8_45%,#fef3c7)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">
            Forehead Mystery
          </p>
          <h1 className="text-3xl font-semibold">Hall of Fame</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Every team that has successfully identified all of their cards.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          {winners.length === 0 ? (
            <p className="text-sm text-slate-500">
              No winners have been recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Team</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Location</th>
                    <th className="py-2 pr-4">Players &amp; Cards</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((winner) => (
                    <tr
                      key={winner.id}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="py-3 pr-4 font-semibold">
                        {winner.teamName}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {winner.date}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {winner.time}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {winner.location}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1.5">
                          {winner.players.map((player, index) => (
                            <span
                              key={`${winner.id}-${index}`}
                              className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                            >
                              {player.name}: {player.card}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
