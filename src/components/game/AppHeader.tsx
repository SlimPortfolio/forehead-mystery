import Link from "next/link";

type AppHeaderProps = {
  /**
   * Optional click handler for the logo/title. When provided (e.g. on the
   * single-page game view, where "home" is a React-state reset rather than a
   * route change) it can call preventDefault and handle navigation itself.
   * When omitted, the logo simply links to "/".
   */
  onLogoClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Right-aligned action slot (game controls, help, winners link, etc.). */
  children?: React.ReactNode;
};

// Shared top bar rendered on every screen so branding and the "return home"
// affordance stay consistent between the game view and the /winners route.
export default function AppHeader({ onLogoClick, children }: AppHeaderProps) {
  return (
    <header className="relative z-30 w-full flex-shrink-0 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
        <Link
          href="/"
          onClick={onLogoClick}
          aria-label="Return to home"
          className="flex min-w-0 items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Forehead Mystery logo"
            className="h-11 w-11 flex-shrink-0 object-cover"
          />
          <h1 className="font-display text-2xl leading-[0.9] font-bold text-ink">
            Forehead
            <br />
            Mystery
          </h1>
        </Link>
        {children != null && (
          <div className="flex flex-shrink-0 items-center gap-1">{children}</div>
        )}
      </div>
    </header>
  );
}
