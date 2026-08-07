"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import {
  FIELD_LIMITS,
  validateFeedback,
  type FeedbackPayload,
  type FeedbackValidationErrors,
} from "@/lib/feedback";

const EMPTY_FORM: FeedbackPayload = {
  subject: "",
  description: "",
  name: "",
  contact: "",
};

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {hint && (
          <span className="ml-1.5 font-normal text-slate-400">{hint}</span>
        )}
      </label>
      {children}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

/** The /feedback form. Validates with the same `validateFeedback` the API uses
 * so the inline errors always match what the server would have said, then
 * swaps itself for a thank-you panel on success rather than navigating away —
 * players who spot a second thing can send another report immediately. */
export default function FeedbackForm() {
  const [form, setForm] = useState<FeedbackPayload>(EMPTY_FORM);
  const [errors, setErrors] = useState<FeedbackValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const update = (field: keyof FeedbackPayload) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    // Clear just this field's error as soon as it's edited, so a corrected
    // field stops looking wrong before the next submit.
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSending) return;

    const { value, errors: validationErrors } = validateFeedback(form);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }

    setIsSending(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setSubmitError(
          data?.error || "Something went wrong. Please try again.",
        );
        return;
      }

      setForm(EMPTY_FORM);
      setIsSent(true);
    } catch {
      setSubmitError("Couldn't reach the server. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2
          className="mx-auto h-10 w-10 text-emerald-600"
          strokeWidth={1.75}
        />
        <div>
          <h2 className="text-xl font-semibold text-ink">Thanks for that!</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your feedback is with the dev team. If you left a way to reach you,
            we&apos;ll follow up when we can.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setIsSent(false)}
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            Send more feedback
          </button>
          <Link
            href="/"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Back to the game
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field label="Subject" htmlFor="subject" error={errors.subject}>
        <input
          id="subject"
          value={form.subject}
          onChange={(event) => update("subject")(event.target.value)}
          maxLength={FIELD_LIMITS.subject}
          placeholder="Enter subject"
          className={inputClasses}
        />
      </Field>

      <Field
        label="What happened?"
        htmlFor="description"
        error={errors.description}
      >
        <textarea
          id="description"
          value={form.description}
          onChange={(event) => update("description")(event.target.value)}
          maxLength={FIELD_LIMITS.description}
          rows={7}
          placeholder="Enter description"
          className={`${inputClasses} resize-y`}
        />
      </Field>

      <Field
        label="Your name"
        hint="(optional)"
        htmlFor="name"
        error={errors.name}
      >
        <input
          id="name"
          value={form.name}
          onChange={(event) => update("name")(event.target.value)}
          maxLength={FIELD_LIMITS.name}
          placeholder="Leave blank to stay anonymous"
          className={inputClasses}
        />
      </Field>

      <Field
        label="How can we reach you?"
        hint="(optional)"
        htmlFor="contact"
        error={errors.contact}
      >
        <input
          id="contact"
          value={form.contact}
          onChange={(event) => update("contact")(event.target.value)}
          maxLength={FIELD_LIMITS.contact}
          placeholder="Email, Instagram, Discord — whatever works"
          className={inputClasses}
        />
        <p className="text-xs text-slate-500">
          We may have follow up questions, but only the dev team sees this.
          It&apos;s never shown in the game.
        </p>
      </Field>

      {submitError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Send className="h-5 w-5" strokeWidth={1.75} />
        {isSending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
