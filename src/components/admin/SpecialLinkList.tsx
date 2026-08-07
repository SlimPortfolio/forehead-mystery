"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { COMBINE_HINT, type SpecialLink } from "@/lib/specialLinks";

function LinkRow({ link, baseUrl }: { link: SpecialLink; baseUrl: string }) {
  const fullUrl = `${baseUrl}/${link.query}`;
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(fullUrl)
      .then(() => {
        setCopied(true);
        if (resetRef.current) clearTimeout(resetRef.current);
        resetRef.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <article className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-ink">{link.label}</h2>
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
          {link.query}
        </code>
      </div>

      <p className="text-sm text-slate-600">{link.description}</p>

      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">
          {fullUrl}
        </code>
        {/* A ?room=CODE link is a template, not something you can paste as-is —
            copying it would just hand you a broken URL. */}
        {link.needsValue ? (
          <span className="flex-shrink-0 text-xs text-slate-400">
            fill in CODE
          </span>
        ) : (
          <button
            onClick={handleCopy}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </article>
  );
}

/** Renders the special-link catalogue with copy buttons. `baseUrl` is resolved
 * on the server so the copied link points at whatever host the admin is
 * actually on, rather than a hardcoded domain. */
export default function SpecialLinkList({
  links,
  baseUrl,
}: {
  links: SpecialLink[];
  baseUrl: string;
}) {
  return (
    <div className="space-y-3">
      {links.map((link) => (
        <LinkRow key={link.query} link={link} baseUrl={baseUrl} />
      ))}
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        {COMBINE_HINT}
      </p>
    </div>
  );
}
