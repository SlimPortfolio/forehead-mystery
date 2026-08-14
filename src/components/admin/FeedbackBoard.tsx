"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Inbox, RefreshCw, Search, SearchX, X } from "lucide-react";
import {
  FEEDBACK_STATUSES,
  isOpenStatus,
  matchesSearch,
  sortByDate,
  SORT_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  type FeedbackRecord,
  type FeedbackStatus,
  type SortOrder,
} from "@/lib/feedback";

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

/**
 * Native <select> dressed up with our own chevron.
 *
 * Deliberately not a custom popup: keeping the real control means mobile
 * browsers open their own wheel/sheet picker, and keyboard plus screen-reader
 * behaviour come for free.
 *
 * `tone` styles the wrapper (background, text, ring); the select itself is
 * transparent and inherits that colour, so the chevron can use currentColor
 * instead of repeating the palette. Options are reset to neutral because they
 * would otherwise inherit the tone and tint the whole open list.
 */
function Select<T extends string>({
  id,
  value,
  options,
  onChange,
  disabled = false,
  tone = "bg-white text-ink ring-slate-300",
}: {
  id: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  tone?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center rounded-lg shadow-sm ring-1 ring-inset transition-colors focus-within:ring-2 focus-within:ring-indigo-400 ${
        disabled ? "opacity-50" : ""
      } ${tone}`}
    >
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        /* text-base below sm keeps iOS Safari from zooming the page in when
           the picker opens, which it does for any control under 16px. */
        className="cursor-pointer appearance-none rounded-lg bg-transparent py-1.5 pl-3 pr-9 text-base font-medium text-inherit outline-none disabled:cursor-wait sm:text-sm"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-white text-slate-800"
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 h-4 w-4 opacity-60"
        strokeWidth={2}
      />
    </div>
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
        <label htmlFor={`status-${item.id}`} className="text-sm text-slate-600">
          Status
        </label>
        {/* Carries the status colour so the control itself reads as the state,
            not just the pill above it. */}
        <Select
          id={`status-${item.id}`}
          value={item.status}
          disabled={isSaving}
          tone={STATUS_STYLES[item.status]}
          onChange={onStatusChange}
          options={FEEDBACK_STATUSES.map((status) => ({
            value: status,
            label: STATUS_LABELS[status],
          }))}
        />
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
 * needing attention vs. anything closed out — with search, status chips and
 * date sorting narrowing what lands in each.
 */
export default function FeedbackBoard({
  initialFeedback,
}: {
  initialFeedback: FeedbackRecord[];
}) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [search, setSearch] = useState("");
  // Empty set means "no status filter", which reads better than pre-selecting
  // all four — clearing chips returns you to the full list.
  const [activeStatuses, setActiveStatuses] = useState<FeedbackStatus[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = search.trim().length > 0 || activeStatuses.length > 0;

  const { open, resolved, matchCount } = useMemo(() => {
    const visible = sortByDate(
      feedback.filter(
        (item) =>
          (activeStatuses.length === 0 ||
            activeStatuses.includes(item.status)) &&
          matchesSearch(item, search),
      ),
      sortOrder,
    );
    return {
      open: visible.filter((item) => isOpenStatus(item.status)),
      resolved: visible.filter((item) => !isOpenStatus(item.status)),
      matchCount: visible.length,
    };
  }, [feedback, activeStatuses, search, sortOrder]);

  const toggleStatus = (status: FeedbackStatus) => {
    setActiveStatuses((current) =>
      current.includes(status)
        ? current.filter((entry) => entry !== status)
        : [...current, status],
    );
  };

  const clearFilters = () => {
    setSearch("");
    setActiveStatuses([]);
  };

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
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search subject, description or name…"
            aria-label="Search feedback"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-ink shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FEEDBACK_STATUSES.map((status) => {
            const isActive = activeStatuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
                  isActive
                    ? STATUS_STYLES[status]
                    : "bg-white text-slate-500 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sort-order" className="text-sm text-slate-600">
            Sort
          </label>
          <Select
            id="sort-order"
            value={sortOrder}
            onChange={setSortOrder}
            options={(Object.keys(SORT_LABELS) as SortOrder[]).map((order) => ({
              value: order,
              label: SORT_LABELS[order],
            }))}
          />

          {hasFilters && (
            <>
              <span className="text-xs text-slate-500">
                {matchCount} of {feedback.length}
              </span>
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-indigo-700 hover:underline"
              >
                Clear filters
              </button>
            </>
          )}

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
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {/* Distinct from the "nothing submitted yet" state above — here there IS
          feedback, the filters just exclude all of it, so the fix is to relax
          them rather than to wait for submissions. */}
      {matchCount === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <SearchX
            className="mx-auto h-8 w-8 text-slate-400"
            strokeWidth={1.75}
          />
          <p className="mt-2 text-sm text-slate-500">
            No feedback matches those filters.
          </p>
          <button
            onClick={clearFilters}
            className="mt-2 text-sm font-medium text-indigo-700 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
