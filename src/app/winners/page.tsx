import AppHeader from "@/components/game/AppHeader";
import { getMongoDb } from "@/lib/mongodb";
import type { WinnerRecord } from "@/lib/winners";
import WinnersMap from "@/components/game/WinnersMap";

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
    lat: typeof doc.lat === "number" ? doc.lat : null,
    lng: typeof doc.lng === "number" ? doc.lng : null,
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
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)] text-ink">
      <AppHeader />
      <div className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col gap-3">
        <section className="flex-1 min-h-0 space-y-6 overflow-y-auto border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-3xl font-semibold">Hall of Fame</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Click on the map pins to see the dates, cards, and locations of
              the winning teams!
            </p>
          </div>

          <div className="space-y-3">
            <WinnersMap winners={winners} />
          </div>

          {/* <div className="space-y-3">
            <h2 className="text-lg font-semibold">All winners</h2>
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
          </div> */}
        </section>
      </div>
    </main>
  );
}
