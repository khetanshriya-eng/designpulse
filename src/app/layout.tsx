import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Jersey_10, Space_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";
import { ScrollReset } from "@/components/ScrollReset";
import { PullToRefresh } from "@/components/PullToRefresh";
import { FeedbackWidget } from "@/components/FeedbackWidget";

// Pixel face — chrome accents (logo, badges, kickers, nav).
const pixel = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  display: "swap",
});

// Headline face — Jersey 10, a clean condensed pixel face. More legible than
// Pixelify at reading sizes while still on-vibe. Single weight (400).
const jersey = Jersey_10({
  variable: "--font-jersey",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Reading layer — summaries, metadata, body copy.
const mono = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://designatorapp.com"),
  title: "Designator",
  description:
    "A daily briefing for product designers. Curated updates from Figma, NN/g, UX Collective, Lenny's, The Verge, and 70+ trusted sources, summarized so you stay current in under five minutes.",
  // og:image / twitter:image come from app/opengraph-image.tsx automatically.
  openGraph: {
    type: "website",
    siteName: "Designator",
    title: "Designator",
    description: "Your daily design briefing — 70+ sources, summarized.",
    url: "https://designatorapp.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Designator",
    description: "Your daily design briefing — 70+ sources, summarized.",
  },
  // RSS autodiscovery — readers find /api/rss when the site URL is pasted in.
  alternates: {
    types: { "application/rss+xml": "/api/rss" },
  },
  // iOS home-screen / standalone: a real app title + a status bar that defers
  // to our theme-color so it blends into the purple/navy nav (see viewport).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Designator",
  },
};

// viewport-fit:cover enables env(safe-area-inset-*) so the sticky nav can clear
// the iOS status bar / Dynamic Island (the #app-scroll container lets content
// ride to the very top edge on iOS).
//
// themeColor tints mobile browser chrome. We ship the light-theme nav purple as
// the static default; the pre-paint script below swaps it to the navy night
// value when the dark theme is active, so the status bar always matches the nav.
//
// maximumScale:5 + userScalable keep pinch-zoom available for accessibility —
// the iOS auto-zoom-on-focus problem is fixed by the 16px input rule in
// globals.css, NOT by disabling zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#5b3df5",
  // Android: shrink the layout viewport when the keyboard opens, so bottom
  // sheets sit above it natively. iOS ignores this — there the BottomSheet's
  // visualViewport anchoring does the same job.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Theme is resolved on the CLIENT (pre-paint inline script below), NOT from
  // request headers — that's what lets every page be statically rendered + ISR
  // + CDN-cached (no per-request server work just to pick a theme). The static
  // HTML ships with a neutral default; the script corrects it before first
  // paint, so there's no flash. suppressHydrationWarning because that script
  // mutates <html> before React hydrates.
  return (
    <html
      lang="en"
      data-theme="light"
      data-auto-theme="light"
      suppressHydrationWarning
      className={`${pixel.variable} ${jersey.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Pre-paint, synchronously: derive the auto theme from the visitor's
          LOCAL time (dark 19:00–06:00), honor a saved manual override, and set
          both data-theme and data-auto-theme so the toggle's "reset to auto"
          works. Tiny + blocking in <head> so it lands before first paint.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement,h=new Date().getHours(),a=(h<6||h>=19)?'dark':'light';d.dataset.autoTheme=a;var t=localStorage.getItem('designator-theme');var th=(t==='light'||t==='dark')?t:a;d.dataset.theme=th;var m=document.querySelector('meta[name=\"theme-color\"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',th==='dark'?'#1a1340':'#5b3df5');}catch(e){}",
          }}
        />
      </head>
      <body className="text-ink">
        {/* Keeps the iOS status-bar/notch region in the nav color (see globals). */}
        <div className="status-bar-fill" aria-hidden />
        {/* #app-scroll owns scrolling on touch — reset it on route changes. */}
        <ScrollReset />
        {/* Fixed overlays live outside the scroll container (viewport-fixed). */}
        <PullToRefresh />
        <ScrollTop />
        <FeedbackWidget />
        {/*
          On touch devices the page scrolls inside this container, not the
          document — that's what lets our pull-to-refresh own the gesture
          instead of the browser's native one (see globals.css `.app-scroll`).
          On desktop it's an inert passthrough and the document scrolls
          normally (keyboard scroll preserved).
        */}
        <div id="app-scroll" className="app-scroll min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
