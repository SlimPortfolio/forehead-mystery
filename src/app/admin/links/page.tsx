import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import WinnersHeader from "@/components/game/WinnersHeader";
import AccountButton from "@/components/admin/AccountButton";
import AdminGate from "@/components/admin/AdminGate";
import SpecialLinkList from "@/components/admin/SpecialLinkList";
import { getAdminIdentity, isSignedIn } from "@/lib/admin";
import { SPECIAL_LINKS } from "@/lib/specialLinks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Special links — Forehead Mystery",
  robots: { index: false, follow: false },
};

/**
 * Resolves the host these links should point at.
 *
 * Deliberately NOT the host you're currently browsing. These links exist to be
 * shared with players, so a `localhost:3000` link — which is what you'd get
 * from `NEXT_PUBLIC_APP_URL` during local development — is useless. The order
 * below always prefers the public production domain:
 *
 *   1. NEXT_PUBLIC_SHARE_BASE_URL — explicit override, mainly so local dev
 *      shows real shareable links instead of localhost.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — set automatically by Vercel on every
 *      deployment (previews included) and always the production domain. It
 *      also tracks a custom domain automatically if one is ever added, so
 *      moving off *.vercel.app needs no code change. Carries no protocol.
 *   3. NEXT_PUBLIC_APP_URL, then the request host — last-resort fallbacks so
 *      the page still renders something sane outside Vercel.
 */
async function resolveBaseUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SHARE_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelDomain) return `https://${vercelDomain}`;

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function AdminLinksPage() {
  // Gated exactly like /admin — this page is directly reachable, so it re-runs
  // the allowlist check itself rather than assuming anything upstream did.
  const admin = await getAdminIdentity();
  const baseUrl = admin ? await resolveBaseUrl() : "";

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#f6f4fe_0%,#e8ecfb_55%,#dde5f6_100%)] text-ink">
      <WinnersHeader>{admin && <AccountButton />}</WinnersHeader>
      <div className="mx-auto flex w-full min-h-0 max-w-2xl flex-1 flex-col gap-3">
        <section className="flex-1 min-h-0 space-y-6 overflow-y-auto border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          {admin ? (
            <>
              <div>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                  Back to feedback
                </Link>
                <h1 className="mt-2 text-3xl font-semibold">Special links</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  URL flags usable to enable special features on the game.
                </p>
                {/* Stated explicitly because these links intentionally point at
                    production even when you're viewing this page on localhost. */}
                {/* <p className="mt-1 text-xs text-slate-400">
                  Links point to{" "}
                  <span className="font-medium text-slate-500">
                    {baseUrl.replace(/^https?:\/\//, "")}
                  </span>
                </p> */}
              </div>
              <SpecialLinkList links={SPECIAL_LINKS} baseUrl={baseUrl} />
            </>
          ) : (
            <AdminGate signedIn={await isSignedIn()} />
          )}
        </section>
      </div>
    </main>
  );
}
