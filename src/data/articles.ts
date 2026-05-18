import type { SourceCategory } from "./sources";

export type ContentType = "article" | "video" | "podcast-episode" | "gallery-item";

export type Article = {
  id: string;
  sourceId: string;
  title: string;
  summary: string;
  url: string;
  author?: string;
  /** ISO timestamp */
  publishedAt: string;
  readMinutes?: number;
  /** for podcasts/videos */
  durationMinutes?: number;
  category: SourceCategory;
  contentType: ContentType;
  isFeatured?: boolean;
  isMustRead?: boolean;
  /** thumbnail accent class — falls back to source swatch */
  swatch?: string;
  /** Real image URL (RSS enclosure/og:image/youtube thumb). Null → typographic fallback. */
  thumbnailUrl?: string | null;
};

// Edition date used across the homepage. In a real build, this is `new Date()`
// in the cron job; for the static prototype, freeze it so the layout looks
// stable.
export const EDITION_DATE = "2026-05-17";

// Helper to build ISO timestamps for "X hours ago" against EDITION_DATE.
const hoursAgo = (h: number) => {
  const d = new Date(EDITION_DATE + "T09:00:00.000Z");
  d.setHours(d.getHours() - h);
  return d.toISOString();
};

export const ARTICLES: Article[] = [
  // --- HERO ---
  {
    id: "a-hero",
    sourceId: "figma-blog",
    title: "Figma introduces Sites: ship a fully responsive website without leaving the canvas",
    summary:
      "Figma's new Sites product lets designers publish responsive marketing pages directly from a Figma file — components, variants, and auto-layout stay live. It collapses the prototype-to-production handoff that has frustrated teams for years, and signals Figma's clearest move yet into the build phase.",
    url: "https://figma.com/blog/sites",
    author: "Dylan Field",
    publishedAt: hoursAgo(2),
    readMinutes: 6,
    category: "design-tools",
    contentType: "article",
    isFeatured: true,
    swatch: "thumb-grad-2",
  },

  // --- LATEST (recent across categories) ---
  {
    id: "a-1",
    sourceId: "nngroup",
    title: "When AI summaries help — and when they quietly mislead users",
    summary:
      "New NN/g eye-tracking study shows users skip past full results when an AI summary is present, even when the summary is wrong. Designers should expose source attribution inline and avoid stacking summaries above critical decisions.",
    url: "https://nngroup.com/articles/ai-summaries",
    author: "Kara Pernice",
    publishedAt: hoursAgo(5),
    readMinutes: 8,
    category: "ux-thinking",
    contentType: "article",
    isMustRead: true,
  },
  {
    id: "a-2",
    sourceId: "uxdesigncc",
    title: "Designing for the agent: why your interface might soon have two users",
    summary:
      "A practical framework for when your UI is being consumed by both a person and an autonomous agent. Covers semantic markup, machine-readable affordances, and the new role of empty states in agentic flows.",
    author: "Fabricio Teixeira",
    url: "https://uxdesign.cc/agentic-ui",
    publishedAt: hoursAgo(8),
    readMinutes: 11,
    category: "ux-thinking",
    contentType: "article",
  },
  {
    id: "a-3",
    sourceId: "yt-juxtopposed",
    title: "I redesigned LinkedIn — here's what actually broke when I tested it",
    summary:
      "Juxtopposed walks through a 6-week LinkedIn redesign and the unusable patterns that emerged in user testing. The most-watched moment: how a 'cleaner' notification model ended up burying recruiter messages.",
    url: "https://youtube.com/watch?v=jux-linkedin",
    author: "Malewicz",
    publishedAt: hoursAgo(11),
    durationMinutes: 24,
    category: "youtube",
    contentType: "video",
  },
  {
    id: "a-4",
    sourceId: "lennys",
    title: "How Linear stayed small and still won the PM tooling space",
    summary:
      "Lenny interviews Karri Saarinen on Linear's deliberately slow hiring, single-spec rule, and why they refuse to ship analytics as a separate product. A useful read for designers in product-driven orgs.",
    url: "https://lennysnewsletter.com/p/linear-karri-saarinen",
    author: "Lenny Rachitsky",
    publishedAt: hoursAgo(14),
    readMinutes: 18,
    category: "product",
    contentType: "article",
  },
  {
    id: "a-5",
    sourceId: "verge",
    title: "Apple's new Vision Pro design language is bleeding into iOS 19",
    summary:
      "Spatial materials, gaussian-blur layers and depth-stacked sheets — the visionOS aesthetic is showing up across iOS 19 betas. Designers building iOS apps should expect a refresh wave to ship by WWDC.",
    url: "https://theverge.com/apple/ios-19-visionos",
    author: "Allison Johnson",
    publishedAt: hoursAgo(17),
    readMinutes: 5,
    category: "tech-news",
    contentType: "article",
  },
  {
    id: "a-6",
    sourceId: "bensbites",
    title: "Cursor for designers? Three new IDE-style design tools to watch",
    summary:
      "Ben rounds up Magic Patterns, Subframe, and v0 Studio — each one tries to be 'the design IDE.' His take: only one of them actually changes the workflow, the others are just chat with a canvas attached.",
    url: "https://bensbites.com/p/design-ide",
    author: "Ben Tossell",
    publishedAt: hoursAgo(19),
    readMinutes: 6,
    category: "ai-tools",
    contentType: "article",
  },

  // --- MUST READ ---
  {
    id: "a-mr-1",
    sourceId: "nngroup",
    title: "The 10 usability heuristics, rewritten for AI-first interfaces",
    summary:
      "Nielsen revisits his 1994 heuristics through an agentic lens. Visibility of system status becomes 'visibility of model state'; user control becomes 'reversibility of agent actions'. Essential reading.",
    url: "https://nngroup.com/articles/heuristics-ai",
    author: "Jakob Nielsen",
    publishedAt: hoursAgo(20),
    readMinutes: 14,
    category: "ux-thinking",
    contentType: "article",
    isMustRead: true,
  },
  {
    id: "a-mr-2",
    sourceId: "smashing",
    title: "Stop animating with JavaScript — CSS scroll-driven animations are ready",
    summary:
      "Cross-browser support for scroll-timeline and view-timeline finally landed. Smashing's guide shows how to replace common Lottie and Framer Motion patterns with 8 lines of CSS — and the perf gains.",
    url: "https://smashingmagazine.com/scroll-driven",
    author: "Bramus Van Damme",
    publishedAt: hoursAgo(22),
    readMinutes: 9,
    category: "ux-thinking",
    contentType: "article",
    isMustRead: true,
  },
  {
    id: "a-mr-3",
    sourceId: "uxtools",
    title: "2025 Design Tools Survey: the year Figma's grip loosened",
    summary:
      "Taylor Palmer's annual survey reports the first measurable drop in Figma's dominance — not from a competitor, but from designers spreading across 5+ tools per workflow. The handoff layer is fragmenting.",
    url: "https://uxtools.co/survey-2025",
    author: "Taylor Palmer",
    publishedAt: hoursAgo(26),
    readMinutes: 12,
    category: "design-tools",
    contentType: "article",
    isMustRead: true,
  },

  // --- EDITOR'S PICK ---
  {
    id: "a-ep",
    sourceId: "firstround",
    title: "The product designer's guide to working with research when there's no researcher",
    summary:
      "First Round breaks down how senior designers at Notion, Linear and Vercel run their own discovery without a research team — including the four-question intake script Notion uses before any new flow.",
    url: "https://review.firstround.com/designer-research",
    author: "Bobbie Chen",
    publishedAt: hoursAgo(28),
    readMinutes: 16,
    category: "product",
    contentType: "article",
    isFeatured: true,
    swatch: "thumb-grad-1",
  },

  // --- CATEGORY: Design Tools ---
  {
    id: "a-dt-1",
    sourceId: "uxtools",
    title: "Subframe just shipped real component variants — and they sync with Figma",
    summary:
      "The Figma-to-code tool added native variants this week. The two-way sync is unusual: change a variant prop in code and your Figma file updates. Worth a look if you maintain a design system.",
    url: "https://uxtools.co/subframe-variants",
    author: "Taylor Palmer",
    publishedAt: hoursAgo(30),
    readMinutes: 4,
    category: "design-tools",
    contentType: "article",
  },
  {
    id: "a-dt-2",
    sourceId: "figma-blog",
    title: "Dev Mode MCP: how to wire your design tokens straight into Claude or Cursor",
    summary:
      "Figma's Model Context Protocol server is now generally available. Tokens, components and the design system can all be queried from an AI coding tool — no more pasting hex codes from Inspect.",
    url: "https://figma.com/blog/dev-mode-mcp",
    publishedAt: hoursAgo(33),
    readMinutes: 7,
    category: "design-tools",
    contentType: "article",
  },

  // --- CATEGORY: AI & Tools ---
  {
    id: "a-ai-1",
    sourceId: "tldrai",
    title: "Anthropic's Claude 4.6 now writes code that actually passes review",
    summary:
      "Internal benchmarks at Vercel and Linear suggest the new model meaningfully reduces the 'AI tax' on PR review. For designers, the practical implication is that prototype-to-PR via Claude is now a reasonable workflow.",
    url: "https://tldr.tech/ai/claude-46",
    publishedAt: hoursAgo(36),
    readMinutes: 5,
    category: "ai-tools",
    contentType: "article",
  },
  {
    id: "a-ai-2",
    sourceId: "rundownai",
    title: "Midjourney v7 ships a real interface — and it changes the design brief",
    summary:
      "The new Midjourney editor adds layers, masking and reference uploads. The implication: AI image gen is moving from 'prompt lottery' to a directable tool. Worth folding into moodboarding workflows now.",
    url: "https://therundown.ai/midjourney-v7",
    publishedAt: hoursAgo(38),
    readMinutes: 4,
    category: "ai-tools",
    contentType: "article",
  },

  // --- CATEGORY: UX Thinking ---
  {
    id: "a-ux-1",
    sourceId: "uxtigers",
    title: "Why your 'AI feature' is being ignored — and the three patterns that fix it",
    summary:
      "Jakob Nielsen analyzes 11 launched AI features at major B2B products. Adoption tracks one variable: whether the feature has a clear inverse action ('undo this AI edit') that the user can find in under 2 seconds.",
    url: "https://uxtigers.com/ai-adoption",
    author: "Jakob Nielsen",
    publishedAt: hoursAgo(40),
    readMinutes: 10,
    category: "ux-thinking",
    contentType: "article",
  },
  {
    id: "a-ux-2",
    sourceId: "designmba",
    title: "The 'feature factory' is dying. The 'craft team' is taking over.",
    summary:
      "A look at how Linear, Figma, Arc and Raycast have organized small craft pods instead of large feature teams — and how that maps onto a designer's day-to-day. Useful framing for IC-track conversations.",
    url: "https://designmba.show/craft-teams",
    publishedAt: hoursAgo(42),
    readMinutes: 8,
    category: "ux-thinking",
    contentType: "article",
  },

  // --- CATEGORY: Tech News ---
  {
    id: "a-tn-1",
    sourceId: "techcrunch",
    title: "Notion acquires Skiff to bring end-to-end encryption into the workspace",
    summary:
      "The Skiff team will lead a new Notion 'private space' product. For designers, the open question is how E2EE constraints will reshape Notion's famously frictionless sharing model.",
    url: "https://techcrunch.com/notion-skiff",
    publishedAt: hoursAgo(44),
    readMinutes: 4,
    category: "tech-news",
    contentType: "article",
  },
  {
    id: "a-tn-2",
    sourceId: "wired",
    title: "Inside Apple's quiet effort to redesign Settings — again",
    summary:
      "Wired reports on an iOS 19 internal build that reorganizes Settings into task-based clusters. Industry observers see it as a long-overdue admission that the current hierarchy collapses under feature load.",
    url: "https://wired.com/apple-settings",
    publishedAt: hoursAgo(46),
    readMinutes: 6,
    category: "tech-news",
    contentType: "article",
  },

  // --- CATEGORY: Product ---
  {
    id: "a-pr-1",
    sourceId: "stratechery",
    title: "The bundling instinct returns: why Notion, Slack and Linear all want to be 'one app'",
    summary:
      "Ben Thompson's read on the SaaS consolidation cycle — and what it means for design teams suddenly asked to build calendar, docs and project tools inside their existing surface area.",
    url: "https://stratechery.com/bundling-2026",
    author: "Ben Thompson",
    publishedAt: hoursAgo(48),
    readMinutes: 13,
    category: "product",
    contentType: "article",
  },
  {
    id: "a-pr-2",
    sourceId: "producthunt",
    title: "Today's #1 launch: Rive ships a true motion handoff to React Native",
    summary:
      "Rive's new export pipeline produces production-grade React Native components — designers can ship complex motion without a Lottie/JSON intermediate step. A small but meaningful shift in the motion toolchain.",
    url: "https://producthunt.com/posts/rive-rn",
    publishedAt: hoursAgo(7),
    readMinutes: 3,
    category: "product",
    contentType: "article",
  },

  // --- INSPIRATION ---
  {
    id: "a-in-1",
    sourceId: "godly",
    title: "Field Notes' new microsite uses a single typeface and still feels alive",
    summary: "Letterpress textures, scroll-anchored type and a deliberate 4-color palette.",
    url: "https://godly.website/field-notes",
    publishedAt: hoursAgo(9),
    category: "inspiration",
    contentType: "gallery-item",
  },
  {
    id: "a-in-2",
    sourceId: "awwwards",
    title: "Studio Lumen — portfolio with a built-in 3D customizer",
    summary: "A small Berlin studio shows how to make a portfolio that demos the work, not just lists it.",
    url: "https://awwwards.com/studio-lumen",
    publishedAt: hoursAgo(16),
    category: "inspiration",
    contentType: "gallery-item",
  },
  {
    id: "a-in-3",
    sourceId: "mobbin",
    title: "Cash App's new send flow — annotated step-by-step",
    summary: "Five screens, four micro-animations and one editorial decision worth stealing.",
    url: "https://mobbin.com/flows/cashapp-send",
    publishedAt: hoursAgo(23),
    category: "inspiration",
    contentType: "gallery-item",
  },
  {
    id: "a-in-4",
    sourceId: "pageflows",
    title: "Linear's onboarding, captured frame-by-frame",
    summary: "How Linear gets a new team from signup to first issue in 42 seconds.",
    url: "https://pageflows.com/linear-onboarding",
    publishedAt: hoursAgo(30),
    category: "inspiration",
    contentType: "gallery-item",
  },

  // --- PODCASTS ---
  {
    id: "a-pod-1",
    sourceId: "designdetails",
    title: "Ep 432 — How Figma's design team works on Figma",
    summary:
      "Brian and Bryn talk to Noah Levin about how Figma's own designers dogfood the product — including the unwritten rule about who is allowed to ship to production without a review.",
    url: "https://designdetails.fm/episodes/432",
    publishedAt: hoursAgo(12),
    durationMinutes: 58,
    category: "podcasts",
    contentType: "podcast-episode",
  },
  {
    id: "a-pod-2",
    sourceId: "99pi",
    title: "Ep 547 — The hidden design of airport wayfinding",
    summary:
      "Why the world's busiest airports converged on the same sign language — and what designers of complex SaaS UIs can borrow from it.",
    url: "https://99percentinvisible.org/episode/547",
    publishedAt: hoursAgo(35),
    durationMinutes: 41,
    category: "podcasts",
    contentType: "podcast-episode",
  },
];

export const heroArticle = ARTICLES.find((a) => a.id === "a-hero")!;
export const editorsPick = ARTICLES.find((a) => a.id === "a-ep")!;
export const mustReads = ARTICLES.filter((a) => a.isMustRead);
export const latestArticles = ARTICLES
  .filter((a) => a.id !== heroArticle.id && a.id !== editorsPick.id)
  .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
  .slice(0, 6);

export const inspirationItems = ARTICLES.filter((a) => a.category === "inspiration");
export const podcastItems = ARTICLES.filter((a) => a.category === "podcasts");

export const byCategory = (cat: string, limit = 2) =>
  ARTICLES.filter((a) => a.category === cat).slice(0, limit);
