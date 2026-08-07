import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Authorization for the /admin area.
 *
 * Clerk answers "who is this?"; this module answers "are they allowed in?".
 * Signing in is not enough — anyone on the internet can create a Clerk account
 * on this instance, so access is gated on an explicit allowlist supplied via
 * environment variables:
 *
 *   ADMIN_EMAILS=you@example.com,teammate@example.com
 *   ADMIN_USER_IDS=user_2abc...            (optional, either one grants access)
 *
 * Two deliberate choices, both fail-closed:
 *   - An empty/missing allowlist authorizes *nobody*. A misconfigured deploy
 *     locks the dev team out rather than exposing players' contact details.
 *   - Only Clerk-*verified* email addresses are matched, so adding an
 *     unverified "you@example.com" to an attacker's own account is useless.
 */

function parseAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export type AdminIdentity = {
  userId: string;
  email: string | null;
};

/**
 * Returns the signed-in admin, or `null` when the request is anonymous or the
 * user is not on the allowlist. Callers must treat `null` as "deny" — this
 * never throws, so a forgotten check is a visible bug rather than a silent
 * pass.
 *
 * Deliberately does not distinguish "signed out" from "not an admin" in its
 * return value; callers decide whether to redirect to sign-in or 404.
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const allowedIds = parseAllowlist(process.env.ADMIN_USER_IDS);
  const allowedEmails = parseAllowlist(process.env.ADMIN_EMAILS);
  if (allowedIds.length === 0 && allowedEmails.length === 0) {
    console.warn(
      "[admin] ADMIN_EMAILS and ADMIN_USER_IDS are both unset — denying all access to /admin",
    );
    return null;
  }

  if (allowedIds.includes(userId.toLowerCase())) {
    return { userId, email: null };
  }

  if (allowedEmails.length === 0) return null;

  const user = await currentUser();
  if (!user) return null;

  const verifiedEmail = user.emailAddresses.find(
    (address) =>
      address.verification?.status === "verified" &&
      allowedEmails.includes(address.emailAddress.toLowerCase()),
  );
  if (!verifiedEmail) return null;

  return { userId, email: verifiedEmail.emailAddress };
}

/** True when the current request is authenticated at all, regardless of
 * whether that user is an admin. Used to choose between "sign in" and
 * "you're signed in as the wrong account" messaging. */
export async function isSignedIn(): Promise<boolean> {
  const { userId } = await auth();
  return Boolean(userId);
}
