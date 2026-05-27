/**
 * Root loading UI. Streams in immediately on every navigation that
 * involves a server-component data fetch (homepage, /sources, /about,
 * /category/[slug], /edition/[date]) before the new content is ready.
 *
 * Visual: a slim accent-colored bar at the very top of the viewport that
 * pulses indefinitely. Cheap to render, doesn't shift layout, and the user
 * always sees that the navigation registered.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden"
    >
      <div className="h-full w-1/3 bg-accent animate-[loading-bar_1.1s_ease-in-out_infinite]" />
      <style>{`
        @keyframes loading-bar {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(200%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
