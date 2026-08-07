"use client";

import { SignIn, SignOutButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

/**
 * What /admin renders instead of the dashboard when the caller isn't an
 * authorized admin. Two distinct states, because they need different fixes:
 * a signed-out visitor needs to sign in, while a signed-in visitor who isn't
 * on the allowlist needs to switch accounts (or be added to ADMIN_EMAILS).
 *
 * This is presentation only — the real gate is `getAdminIdentity()` on the
 * server, which is what decides whether any feedback data is ever fetched.
 */
export default function AdminGate({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <ShieldAlert
          className="mx-auto h-10 w-10 text-amber-600"
          strokeWidth={1.75}
        />
        <div>
          <h1 className="text-xl font-semibold text-ink">
            This account can&apos;t open the admin area
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            You&apos;re signed in, but this account isn&apos;t on the dev team
            allowlist. Sign out and try the account whose email is listed in{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
              ADMIN_EMAILS
            </code>
            .
          </p>
        </div>
        <SignOutButton>
          <button className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
            Sign out
          </button>
        </SignOutButton>
      </div>
    );
  }

  // Hash routing keeps the whole sign-in flow on /admin, so there's no
  // catch-all sign-in route to add or keep in sync.
  //
  // The redirect URLs are pinned to /admin on purpose. Clerk otherwise falls
  // back to its hosted Account Portal at accounts.<domain>, which cannot exist
  // on a *.vercel.app domain — nobody can add DNS records for it, so the
  // browser just gets ERR_CONNECTION_CLOSED. Keeping every hop on our own
  // origin avoids that entirely.
  //
  // Sign-up and the social/SSO buttons are hidden for the same reason plus a
  // policy one: admin accounts are created by hand in the Clerk dashboard, so
  // a "Sign up" link here can only ever lead somewhere broken or somewhere
  // unauthorized. Hiding them leaves email + password as the one way in.
  return (
    <div className="flex justify-center">
      <SignIn
        routing="hash"
        forceRedirectUrl="/admin"
        fallbackRedirectUrl="/admin"
        appearance={{
          elements: {
            footerAction: { display: "none" },
            socialButtonsRoot: { display: "none" },
            dividerRow: { display: "none" },
          },
        }}
      />
    </div>
  );
}
