"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Link2, ShieldCheck } from "lucide-react";

/**
 * The Clerk avatar, with the dev-team shortcuts added to its dropdown.
 *
 * Rendered in the header on both the game view and /admin so a signed-in
 * admin can always jump to the tools. The explicit `isSignedIn` guard means
 * players get byte-for-byte the header they had before — nothing renders, and
 * no gap is reserved, rather than trusting `<UserButton>` to no-op.
 *
 * The menu links only *appear* for signed-in users; they don't grant anything.
 * Both destinations re-check the allowlist server-side, so a non-admin who
 * happens to have a Clerk account gets the same "not authorized" screen as
 * anyone else.
 */
export default function AccountButton() {
  const { isSignedIn } = useUser();
  if (!isSignedIn) return null;

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="Admin Dashboard"
          labelIcon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
          href="/admin"
        />
        <UserButton.Link
          label="Special links"
          labelIcon={<Link2 className="h-4 w-4" strokeWidth={1.75} />}
          href="/admin/links"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
