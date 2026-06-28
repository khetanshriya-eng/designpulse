/**
 * Route loading UI. Next streams the layout (nav + footer) immediately and
 * fills the page in when its server components resolve; without a meaningful
 * fallback the middle is briefly empty. This renders a pixel skeleton of the
 * real layout (hero + card grid) so the page feels like it's assembling, not
 * broken. Pulses are neutralized under prefers-reduced-motion (globals.css).
 */
export default function Loading() {
  return (
    <>
      {/* Slim top progress bar. */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading"
        className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden"
      >
        <div className="h-full w-1/3 bg-accent animate-[loading-bar_1.1s_ease-in-out_infinite]" />
        <style>{`@keyframes loading-bar {0%{transform:translateX(-100%)}50%{transform:translateX(200%)}100%{transform:translateX(400%)}}`}</style>
      </div>

      <div
        className="site-container pt-8 sm:pt-10"
        aria-hidden
      >
        {/* Hero skeleton */}
        <div className="surface-card grid md:grid-cols-2 items-stretch mb-12">
          <div className="min-h-[240px] md:min-h-[340px] bg-paper-tint animate-pulse" />
          <div className="p-6 sm:p-8 flex flex-col justify-center gap-4">
            <div className="h-4 w-24 bg-paper-tint animate-pulse" />
            <div className="h-7 w-4/5 bg-paper-tint animate-pulse" />
            <div className="h-7 w-3/5 bg-paper-tint animate-pulse" />
            <div className="h-4 w-full bg-paper-tint animate-pulse mt-2" />
            <div className="h-4 w-5/6 bg-paper-tint animate-pulse" />
          </div>
        </div>

        {/* Latest grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-10 pb-16">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-card flex flex-col">
              <div className="aspect-[16/10] bg-paper-tint animate-pulse" />
              <div className="p-4 flex flex-col gap-2">
                <div className="h-3 w-20 bg-paper-tint animate-pulse" />
                <div className="h-5 w-full bg-paper-tint animate-pulse" />
                <div className="h-4 w-2/3 bg-paper-tint animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
