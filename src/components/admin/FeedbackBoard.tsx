"use client";

import { useMemo, useState } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import {
  FEEDBACK_STATUSES,
  isOpenStatus,
  STATUS_LABELS,
  STATUS_STYLES,
  type FeedbackRecord,
  type FeedbackStatus,
} from "@/lib/feedback";

type StatusFilter = FeedbackStatus | "all";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusPill({ status }: { status: FeedbackStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function FeedbackCard({
  item,
  onStatusChange,
  isSaving,
}: {
  item: FeedbackRecord;
  onStatusChange: (status: FeedbackStatus) => void;
  isSaving: boolean;
}) {
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold break-words text-ink">{item.subject}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDate(item.createdAt)}
          </p>
        </div>
        <StatusPill status={item.status} />
      </div>

      <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
        {item.description}
      </p>

      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-1.5">
          <dt className="flex-shrink-0 text-slate-500">From:</dt>
          <dd className="min-w-0 break-words text-slate-800">
            {item.name || <span className="text-slate-400">Anonymous</span>}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="flex-shrink-0 text-slate-500">Contact:</dt>
          <dd className="min-w-0 break-words text-slate-800">
            {item.contact || (
              <span className="text-slate-400">None provided</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        <label
          htmlFor={`status-${item.id}`}
          className="text-sm text-slate-600"
        >
          Status
        </label>
        <select
          id={`status-${item.id}`}
          value={item.status}
          disabled={isSaving}
          onChange={(event) =>
            onStatusChange(event.target.value as FeedbackStatus)
          }
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-ink shadow-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
        >
          {FEEDBACK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {isSaving && <span className="text-xs text-slate-400">Saving…</span>}
      </div>
    </article>
  );
}

function Section({
  title,
  items,
  emptyMessage,
  onStatusChange,
  savingId,
}: {
  title: string;
  items: FeedbackRecord[];
  emptyMessage: string;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
  savingId: string | null;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        {title}
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              isSaving={savingId === item.id}
              onStatusChange={(status) => onStatusChange(item.id, status)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * The /admin dashboard. Seeded with server-rendered data so the first paint
 * already has the feedback in it, then mutates in place as statuses change.
 *
 * Splits into the two piles the dev team actually works from — anything still
 * needing attention vs. anything closed out — while the status filter narrows
 * to a single specific status when triaging.
 */
export default function FeedbackBoard({
  initialFeedback,
}: {
  initialFeedback: FeedbackRecord[];
}) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { open, resolved } = useMemo(() => {
    const visible =
      filter === "all"
        ? feedback
        : feedback.filter((item) => item.status === filter);
    return {
      open: visible.filter((item) => isOpenStatus(item.status)),
      resolved: visible.filter((item) => !isOpenStatus(item.status)),
    };
  }, [feedback, filter]);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const previous = feedback;
    setSavingId(id);
    setError(null);
    // Optimistic: the card jumps to its new section immediately, and rolls
    // back to `previous` if the write is rejected.
    setFeedback((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );

    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setFeedback(previous);
        setError("Couldn't update that status. Please try again.");
      }
    } catch {
      setFeedback(previous);
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/feedback", {
        cache: "no-store",
      });
      if (!response.ok) {
        setError("Couldn't reload the feedback.");
        return;
      }
      const data = await response.json();
      setFeedback(data.feedback ?? []);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (feedback.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <Inbox className="mx-auto h-8 w-8 text-slate-400" strokeWidth={1.75} />
        <p className="mt-2 text-sm text-slate-500">
          No feedback has come in yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="status-filter" className="text-sm text-slate-600">
          Filter
        </label>
        <select
          id="status-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value as StatusFilter)}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-ink shadow-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">All statuses</option>
          {FEEDBACK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            strokeWidth={1.75}
          />
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <Section
        title="New Feedback"
        items={open}
        emptyMessage="Nothing waiting — the queue is clear."
        onStatusChange={handleStatusChange}
        savingId={savingId}
      />
      <Section
        title="Addressed Feedback"
        items={resolved}
        emptyMessage="Nothing has been closed out yet."
        onStatusChange={handleStatusChange}
        savingId={savingId}
      />
    </div>
  );
}
