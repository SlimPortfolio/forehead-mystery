"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import HeaderActions from "./HeaderActions";
import HelpModal from "./HelpModal";

/** Client wrapper so server-component pages (/winners, /data, /feedback,
 * /admin) can still open the shared How to Play modal from the header menu.
 * The modal is rendered as a sibling of AppHeader, not inside it, so it isn't
 * nested inside the header's backdrop-blur (which would otherwise become the
 * containing block for the modal's fixed overlay and anchor it to the top of
 * the header). */
export default function WinnersHeader({
  children,
}: {
  /** Extra actions placed to the left of the ☰ menu — currently the Clerk
   * avatar on /admin. Deliberately additive: the site menu must stay
   * reachable on every page, so it is never replaced. */
  children?: React.ReactNode;
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <AppHeader>
        {children}
        <HeaderActions onShowHelp={() => setShowHelp(true)} />
      </AppHeader>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}
