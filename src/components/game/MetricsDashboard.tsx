"use client";

import { useMemo, useState } from "react";
import {
  isWithinRange,
  METRIC_RANGES,
  type GameMetricRecord,
  type MetricRange,
} from "@/lib/metrics";

type Tab = "normal" | "highElo";

// Player-count filter. "any" keeps every game; the rest match an exact head
// count. The game seats 4–8, so those are the buckets offered.
type PlayerCount = "any" | 4 | 5 | 6 | 7 | 8;
const PLAYER_COUNTS: { id: PlayerCount; label: string }[] = [
  { id: 4, label: "4P" },
  { id: 5, label: "5P" },
  { id: 6, label: "6P" },
  { id: 7, label: "7P" },
  { id: 8, label: "8P" },
  // Kept last so the catch-all sits on the right, mirroring "All" in the range row.
  { id: "any", label: "Any" },
];

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
}

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100 * 100) / 100;
}

function winRate(games: GameMetricRecord[]): number {
  const wins = games.filter((game) => game.gameWon).length;
  return pct(wins, games.length);
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

export default function MetricsDashboard({
  metrics,
}: {
  metrics: GameMetricRecord[];
}) {
  const [tab, setTab] = useState<Tab>("normal");
  const [range, setRange] = useState<MetricRange>("ALL");
  const [playerCount, setPlayerCount] = useState<PlayerCount>("any");

  // Apply the time-range and player-count filters first, then split by game
  // type — so the type-tab counts and every stat below reflect all three.
  const scopedGames = useMemo(
    () =>
      metrics.filter(
        (game) =>
          isWithinRange(game.createdAt, range) &&
          (playerCount === "any" || game.numberOfPlayers === playerCount),
      ),
    [metrics, range, playerCount],
  );

  const normalGames = useMemo(
    () => scopedGames.filter((game) => !game.highEloMatch),
    [scopedGames],
  );
  const highEloGames = useMemo(
    () => scopedGames.filter((game) => game.highEloMatch),
    [scopedGames],
  );

  const games = tab === "highElo" ? highEloGames : normalGames;

  const totalGames = games.length;
  const wins = games.filter((game) => game.gameWon).length;
  const binkRate = average(games.map((game) => game.percentCorrectGuess));
  const avgCorrectRank = average(
    games.map((game) => game.percentOfCorrectRank),
  );

  // A game where every player ended on their true rank.
  const allRanksCorrect = (game: GameMetricRecord) =>
    game.numberOfPlayers > 0 &&
    game.numberOfCorrectRank === game.numberOfPlayers;

  // Metric 1: does nailing the ranks track with winning? The win rate among
  // games where every rank came out correct.
  const ranksCorrectGames = games.filter(allRanksCorrect);

  // How often every player nails their rank, across all games in this tab.
  const allRanksCorrectRate = pct(ranksCorrectGames.length, totalGames);

  // Metric 2: of the games that were won, how many also had a perfect rank
  // ordering?
  const victories = games.filter((game) => game.gameWon);
  const perfectRankVictories = victories.filter(allRanksCorrect);
  const perfectRankVictoryRate = pct(
    perfectRankVictories.length,
    victories.length,
  );

  // The flip side: of all wins, how many had at least one rank wrong.
  const imperfectRankVictories = victories.filter(
    (game) => !allRanksCorrect(game),
  );
  const imperfectRankVictoryRate = pct(
    imperfectRankVictories.length,
    victories.length,
  );

  // Across won games, the average share of players who landed on their true
  // rank — i.e. what portion of cards were "in the right range" in victories.
  const victoryRightRangeRate = average(
    victories.map((game) => game.percentOfCorrectRank),
  );

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "normal", label: "Normal games", count: normalGames.length },
    { id: "highElo", label: "High Elo", count: highEloGames.length },
  ];

  return (
    <>
      <div className="space-y-1">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Date Range
        </p>
        <div
          role="tablist"
          aria-label="Date range"
          className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-100/70 p-1"
        >
          {METRIC_RANGES.map(({ id, label }) => {
          const active = range === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setRange(id)}
              className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-white text-ink shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Number of Players
        </p>
        <div
          role="tablist"
          aria-label="Number of players"
          className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-100/70 p-1"
        >
          {PLAYER_COUNTS.map(({ id, label }) => {
          const active = playerCount === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setPlayerCount(id)}
              className={`flex-1 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-white text-ink shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          );
          })}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Game type"
        className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-100/70 p-1"
      >
        {tabs.map(({ id, label, count }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-white text-ink shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  active
                    ? "bg-slate-100 text-slate-600"
                    : "bg-slate-200/70 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {totalGames === 0 ? (
        <p className="text-sm text-slate-500">
          No {tab === "highElo" ? "high Elo" : "normal"} games
          {range === "ALL" && playerCount === "any"
            ? " have been logged yet"
            : " match these filters"}
          .
        </p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">General Statistics</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard label="Total games" value={String(totalGames)} />
              <StatCard
                label="Win rate"
                value={`${winRate(games)}%`}
                sub={`${wins} of ${totalGames} ${
                  totalGames === 1 ? "game" : "games"
                } won`}
              />
              <StatCard
                label="Bink rate"
                value={`${binkRate}%`}
                sub="Rate in which a player guesses their card correctly."
              />
              <StatCard
                label="Avg correct rank"
                value={`${avgCorrectRank}%`}
                sub="Rate in which a player nails their rank."
              />
              <StatCard
                label="All ranks correct"
                value={`${allRanksCorrectRate}%`}
                sub={`${ranksCorrectGames.length} of ${totalGames} ${
                  totalGames === 1 ? "game" : "games"
                }`}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Victory Statistics</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard
                label="Win rate · all ranks correct"
                value={`${winRate(ranksCorrectGames)}%`}
                sub={`${ranksCorrectGames.length} ${
                  ranksCorrectGames.length === 1 ? "game" : "games"
                }`}
              />
              <StatCard
                label="Wins · some ranks wrong"
                value={`${imperfectRankVictoryRate}%`}
                sub={`${imperfectRankVictories.length} of ${victories.length} ${
                  victories.length === 1 ? "win" : "wins"
                }`}
              />
              <StatCard
                label="Perfect-rank victories"
                value={`${perfectRankVictoryRate}%`}
                sub={`${perfectRankVictories.length} of ${victories.length} ${
                  victories.length === 1 ? "win" : "wins"
                }`}
              />
              <StatCard
                label="Wins · cards in right range"
                value={`${victoryRightRangeRate}%`}
                sub="Avg share of cards on their true rank, in won games."
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
