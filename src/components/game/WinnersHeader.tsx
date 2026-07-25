"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import HeaderActions from "./HeaderActions";
import HelpModal from "./HelpModal";

/** Client wrapper so the /winners page (a server component) can still open
 * the shared How to Play modal from the header menu. The modal is rendered
 * as a sibling of AppHeader, not inside it, so it isn't nested inside the
 * header's backdrop-blur (which would otherwise become the containing block
 * for the modal's fixed overlay and anchor it to the top of the header). */
export default function WinnersHeader() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <AppHeader>
        <HeaderActions onShowHelp={() => setShowHelp(true)} />
      </AppHeader>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}
