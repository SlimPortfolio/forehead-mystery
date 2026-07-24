type TransitionOverlayProps = {
  label?: string;
};

/** Loading mask scoped to its positioned parent, shown briefly while a new game deals/reorders cards so the layout shuffle isn't visible mid-jump. */
export default function TransitionOverlay({ label = "Loading..." }: TransitionOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-ink" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
