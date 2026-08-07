/**
 * Shared types and validation rules for player-submitted feedback.
 *
 * Imported by both sides of the wire — the /feedback form validates locally so
 * the player gets instant errors, and /api/feedback re-runs the same checks so
 * a hand-rolled POST can't write a malformed or oversized document.
 */

export const FEEDBACK_STATUSES = [
  "new",
  "in_progress",
  "addressed",
  "wont_fix",
] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** Statuses that still need the dev team's attention. Everything not listed
 * here counts as resolved, so adding a future status defaults it to "open"
 * (visible) rather than silently hiding it in the Addressed pile. */
const OPEN_STATUSES: FeedbackStatus[] = ["new", "in_progress"];

export function isOpenStatus(status: FeedbackStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return FEEDBACK_STATUSES.includes(value as FeedbackStatus);
}

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  in_progress: "In progress",
  addressed: "Addressed",
  wont_fix: "Won't fix",
};

/** Tailwind classes for each status pill, kept beside the labels so a new
 * status can't be added with a label but no styling. */
export const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  in_progress: "bg-amber-100 text-amber-800 ring-amber-200",
  addressed: "bg-slate-200 text-slate-700 ring-slate-300",
  wont_fix: "bg-rose-100 text-rose-800 ring-rose-200",
};

// Length caps. Generous enough for a real bug report, tight enough that a
// single POST can't push a megabyte into the collection.
export const FIELD_LIMITS = {
  subject: 120,
  description: 4000,
  name: 60,
  contact: 200,
} as const;

export type FeedbackPayload = {
  subject: string;
  description: string;
  /** Optional — blank means the player chose to stay anonymous. */
  name: string;
  /** Optional free-form contact handle (email, Instagram, Discord, …). It is
   * deliberately not parsed or validated as an email: players were asked for
   * "whatever works", so anything they type is stored verbatim. */
  contact: string;
};

export type FeedbackRecord = FeedbackPayload & {
  id: string;
  status: FeedbackStatus;
  createdAt: string;
  /** When the status last changed, and which Clerk user changed it. Absent on
   * records that have never been triaged. */
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
};

export type FeedbackValidationErrors = Partial<Record<keyof FeedbackPayload, string>>;

/**
 * Trims every field and reports the first problem with each. Returns the
 * cleaned payload alongside the errors so callers can persist `value` directly
 * once `errors` comes back empty.
 */
export function validateFeedback(input: Partial<FeedbackPayload>): {
  value: FeedbackPayload;
  errors: FeedbackValidationErrors;
} {
  const value: FeedbackPayload = {
    subject: String(input.subject ?? "").trim(),
    description: String(input.description ?? "").trim(),
    name: String(input.name ?? "").trim(),
    contact: String(input.contact ?? "").trim(),
  };

  const errors: FeedbackValidationErrors = {};

  if (!value.subject) {
    errors.subject = "Please add a short subject.";
  } else if (value.subject.length > FIELD_LIMITS.subject) {
    errors.subject = `Keep the subject under ${FIELD_LIMITS.subject} characters.`;
  }

  if (!value.description) {
    errors.description = "Please tell us a bit more.";
  } else if (value.description.length > FIELD_LIMITS.description) {
    errors.description = `Keep the description under ${FIELD_LIMITS.description} characters.`;
  }

  if (value.name.length > FIELD_LIMITS.name) {
    errors.name = `Keep your name under ${FIELD_LIMITS.name} characters.`;
  }

  if (value.contact.length > FIELD_LIMITS.contact) {
    errors.contact = `Keep the contact under ${FIELD_LIMITS.contact} characters.`;
  }

  return { value, errors };
}
