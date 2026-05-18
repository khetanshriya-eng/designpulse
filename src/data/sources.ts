export type SourceCategory =
  | "design-tools"
  | "ux-thinking"
  | "inspiration"
  | "youtube"
  | "product"
  | "tech-news"
  | "ai-tools"
  | "newsletters"
  | "podcasts";

export type SourceType =
  | "blog"
  | "newsletter"
  | "youtube"
  | "podcast"
  | "gallery"
  | "forum"
  | "publication";

export type Source = {
  id: string;
  name: string;
  slug: string;
  url: string;
  feedUrl?: string;
  type: SourceType;
  category: SourceCategory;
  /** 2 char initials for the source avatar (used as visual identity in prototype) */
  initials: string;
  /** background swatch — Tailwind class name from .thumb-grad-* */
  swatch: string;
  /** Resolved YouTube UC... channel id (only set for type === "youtube") */
  youtubeChannelId?: string;
};

export const SOURCES: Source[] = [
  // Design — Tools & Updates
  { id: "figma-blog", name: "Figma Blog", slug: "figma-blog", url: "https://www.figma.com/blog/", type: "blog", category: "design-tools", initials: "Fi", swatch: "thumb-grad-2" },
  { id: "figma-shortcuts", name: "Figma Shortcuts", slug: "figma-shortcuts", url: "https://figmashortcuts.com", type: "blog", category: "design-tools", initials: "Fs", swatch: "thumb-grad-1" },
  { id: "toools", name: "TOOOLS.design", slug: "toools", url: "https://www.toools.design/", type: "newsletter", category: "design-tools", initials: "To", swatch: "thumb-grad-10" },
  { id: "sidebar", name: "Sidebar.io", slug: "sidebar", url: "https://sidebar.io", feedUrl: "https://sidebar.io/feed.xml", type: "newsletter", category: "design-tools", initials: "Sb", swatch: "thumb-grad-3" },
  { id: "uxtools", name: "UX Tools", slug: "uxtools", url: "https://www.uxtools.co/", type: "blog", category: "design-tools", initials: "Ux", swatch: "thumb-grad-5" },
  { id: "prototypr", name: "Prototypr.io", slug: "prototypr", url: "https://prototypr.io", feedUrl: "https://prototypr.io/feed.xml", type: "newsletter", category: "design-tools", initials: "Pr", swatch: "thumb-grad-7" },

  // Design — Thinking & Craft
  { id: "uxdesigncc", name: "UX Collective", slug: "uxdesigncc", url: "https://uxdesign.cc", feedUrl: "https://uxdesign.cc/feed", type: "publication", category: "ux-thinking", initials: "UX", swatch: "thumb-grad-1" },
  { id: "designmba", name: "Design MBA", slug: "designmba", url: "https://www.designmba.show/", feedUrl: "https://feeds.simplecast.com/740y1GZg", type: "podcast", category: "ux-thinking", initials: "DM", swatch: "thumb-grad-6" },
  { id: "nngroup", name: "NN/g", slug: "nngroup", url: "https://nngroup.com", feedUrl: "https://nngroup.com/feed/rss/", type: "publication", category: "ux-thinking", initials: "NN", swatch: "thumb-grad-2" },
  { id: "uxtigers", name: "UX Tigers", slug: "uxtigers", url: "https://uxtigers.com", feedUrl: "https://uxtigers.com/feed", type: "blog", category: "ux-thinking", initials: "UT", swatch: "thumb-grad-4" },
  { id: "smashing", name: "Smashing Magazine", slug: "smashing", url: "https://smashingmagazine.com", feedUrl: "https://smashingmagazine.com/feed/", type: "publication", category: "ux-thinking", initials: "SM", swatch: "thumb-grad-2" },
  { id: "idf", name: "Interaction Design Foundation", slug: "idf", url: "https://interaction-design.org", feedUrl: "https://interaction-design.org/rss/news.xml", type: "publication", category: "ux-thinking", initials: "ID", swatch: "thumb-grad-3" },
  { id: "designspells", name: "Design Spells", slug: "designspells", url: "https://designspells.com", type: "newsletter", category: "ux-thinking", initials: "Ds", swatch: "thumb-grad-7" },
  { id: "dense", name: "Dense Discovery", slug: "dense", url: "https://densediscovery.com", type: "newsletter", category: "ux-thinking", initials: "Dd", swatch: "thumb-grad-10" },
  { id: "itsnicethat", name: "It's Nice That", slug: "itsnicethat", url: "https://itsnicethat.com", feedUrl: "https://itsnicethat.com/feed", type: "publication", category: "ux-thinking", initials: "IN", swatch: "thumb-grad-4" },
  { id: "femke-blog", name: "Femke.design", slug: "femke-blog", url: "https://femke.design", type: "newsletter", category: "ux-thinking", initials: "Fe", swatch: "thumb-grad-8" },

  // Inspiration
  { id: "mobbin", name: "Mobbin", slug: "mobbin", url: "https://mobbin.com", type: "gallery", category: "inspiration", initials: "Mo", swatch: "thumb-grad-1" },
  { id: "godly", name: "Godly", slug: "godly", url: "https://godly.website", type: "gallery", category: "inspiration", initials: "Go", swatch: "thumb-grad-6" },
  { id: "awwwards", name: "Awwwards", slug: "awwwards", url: "https://awwwards.com", feedUrl: "https://awwwards.com/rss-feed", type: "gallery", category: "inspiration", initials: "Aw", swatch: "thumb-grad-1" },
  { id: "dribbble", name: "Dribbble", slug: "dribbble", url: "https://dribbble.com", feedUrl: "https://dribbble.com/shots/popular.rss", type: "gallery", category: "inspiration", initials: "Dr", swatch: "thumb-grad-8" },
  { id: "landingfolio", name: "Landingfolio", slug: "landingfolio", url: "https://landingfolio.com", type: "gallery", category: "inspiration", initials: "Lf", swatch: "thumb-grad-3" },
  { id: "pageflows", name: "Page Flows", slug: "pageflows", url: "https://pageflows.com", type: "gallery", category: "inspiration", initials: "Pf", swatch: "thumb-grad-5" },

  // YouTube
  { id: "yt-figma", name: "Figma (YT)", slug: "yt-figma", url: "https://youtube.com/@figma", type: "youtube", category: "youtube", initials: "Fi", swatch: "thumb-grad-2", youtubeChannelId: "UCQsVmhSa4X-G3lHlUtejzLA" },
  { id: "yt-juxtopposed", name: "Juxtopposed", slug: "yt-juxtopposed", url: "https://youtube.com/@juxtopposed", type: "youtube", category: "youtube", initials: "Ju", swatch: "thumb-grad-7", youtubeChannelId: "UCa8W2_uf81Ew6gYuw0VPSeA" },
  { id: "yt-jesse", name: "Jesse Showalter", slug: "yt-jesse", url: "https://youtube.com/@JesseShowalter", type: "youtube", category: "youtube", initials: "Je", swatch: "thumb-grad-3", youtubeChannelId: "UCvBGFeXbBrq3W9_0oNLJREQ" },
  { id: "yt-malewicz", name: "Malewicz", slug: "yt-malewicz", url: "https://youtube.com/@MalewiczHype", type: "youtube", category: "youtube", initials: "Ma", swatch: "thumb-grad-1", youtubeChannelId: "UC_Dq0oUEi7uXhdUX8prunbw" },
  { id: "yt-designcourse", name: "DesignCourse", slug: "yt-designcourse", url: "https://youtube.com/@DesignCourse", type: "youtube", category: "youtube", initials: "DC", swatch: "thumb-grad-4", youtubeChannelId: "UCVyRiMvfUNMA1UPlDPzG5Ow" },
  { id: "yt-flux", name: "Flux Academy", slug: "yt-flux", url: "https://youtube.com/@FluxAcademy", type: "youtube", category: "youtube", initials: "Fl", swatch: "thumb-grad-6", youtubeChannelId: "UCN7dywl5wDxTu1RM3eJ_h9Q" },
  { id: "yt-charli", name: "CharliMarie", slug: "yt-charli", url: "https://youtube.com/@CharliMarieTV", type: "youtube", category: "youtube", initials: "Ch", swatch: "thumb-grad-8", youtubeChannelId: "UCScRSwdX0t31gjk3MYXIuYQ" },
  { id: "yt-ridd", name: "Dive Club by Ridd", slug: "yt-ridd", url: "https://youtube.com/@joindiveclub", type: "youtube", category: "youtube", initials: "Ri", swatch: "thumb-grad-5", youtubeChannelId: "UCkCnraWwlnBw1_i7C9-3p0w" },
  { id: "yt-mizko", name: "Mizko", slug: "yt-mizko", url: "https://youtube.com/@Mizko", type: "youtube", category: "youtube", initials: "Mi", swatch: "thumb-grad-9", youtubeChannelId: "UCZJkZy008cQjqkJeKpJu8tA" },
  { id: "yt-futur", name: "The Futur", slug: "yt-futur", url: "https://youtube.com/@thefutur", type: "youtube", category: "youtube", initials: "TF", swatch: "thumb-grad-1", youtubeChannelId: "UC-b3c7kxa5vU-bnmaROgvog" },
  { id: "yt-ajsmart", name: "AJ&Smart", slug: "yt-ajsmart", url: "https://youtube.com/@AJSmart", type: "youtube", category: "youtube", initials: "AJ", swatch: "thumb-grad-2", youtubeChannelId: "UCeB_OpLspKJGiKv1CYkWFFw" },
  { id: "yt-satori", name: "Satori Graphics", slug: "yt-satori", url: "https://youtube.com/@SatoriGraphics", type: "youtube", category: "youtube", initials: "Sg", swatch: "thumb-grad-7", youtubeChannelId: "UCoeJKtPJLoIBqWq4o8TDLpA" },
  { id: "yt-uxtigers", name: "UX Tigers (YT)", slug: "yt-uxtigers", url: "https://youtube.com/@UXtigers", type: "youtube", category: "youtube", initials: "UT", swatch: "thumb-grad-4", youtubeChannelId: "UClcHLdKqI-_xUthkLLZZ_xg" },
  { id: "yt-nngroup", name: "NNGroup (YT)", slug: "yt-nngroup", url: "https://youtube.com/@NNgroup", type: "youtube", category: "youtube", initials: "NN", swatch: "thumb-grad-2", youtubeChannelId: "UC2oCugzU6W8-h95W7eBTUEg" },
  { id: "yt-femke", name: "Femke.design (YT)", slug: "yt-femke", url: "https://youtube.com/@femkedesign", type: "youtube", category: "youtube", initials: "Fe", swatch: "thumb-grad-8", youtubeChannelId: "UCWUGGwfTfJ0-2jUS3dZqOJA" },
  { id: "yt-punit", name: "Punit Chawla", slug: "yt-punit", url: "https://youtube.com/@PunitChawla", type: "youtube", category: "youtube", initials: "PC", swatch: "thumb-grad-3", youtubeChannelId: "UCkfdb6tUwVoGXPPzY7H6hUg" },
  { id: "yt-designerup", name: "DesignerUp", slug: "yt-designerup", url: "https://youtube.com/@designerup", type: "youtube", category: "youtube", initials: "Du", swatch: "thumb-grad-6", youtubeChannelId: "UCw2R8kz3aotYtV9utqf0uaw" },
  { id: "yt-champs", name: "Design Champs", slug: "yt-champs", url: "https://youtube.com/@DesignChamps", type: "youtube", category: "youtube", initials: "EC", swatch: "thumb-grad-5" },

  // Product & Startup
  { id: "lennys", name: "Lenny's Newsletter", slug: "lennys", url: "https://lennysnewsletter.com", feedUrl: "https://lennysnewsletter.com/feed", type: "newsletter", category: "product", initials: "LN", swatch: "thumb-grad-5" },
  { id: "firstround", name: "First Round Review", slug: "firstround", url: "https://review.firstround.com", feedUrl: "https://review.firstround.com/feed", type: "blog", category: "product", initials: "FR", swatch: "thumb-grad-1" },
  { id: "stratechery", name: "Stratechery", slug: "stratechery", url: "https://stratechery.com", feedUrl: "https://stratechery.com/feed/", type: "newsletter", category: "product", initials: "St", swatch: "thumb-grad-3" },
  { id: "productdisrupt", name: "Product Disrupt", slug: "productdisrupt", url: "https://productdisrupt.com", type: "newsletter", category: "product", initials: "PD", swatch: "thumb-grad-7" },
  { id: "producthunt", name: "Product Hunt", slug: "producthunt", url: "https://producthunt.com", feedUrl: "https://producthunt.com/feed", type: "forum", category: "product", initials: "PH", swatch: "thumb-grad-4" },

  // Tech News
  { id: "verge", name: "The Verge", slug: "verge", url: "https://theverge.com", feedUrl: "https://theverge.com/rss/index.xml", type: "publication", category: "tech-news", initials: "Vg", swatch: "thumb-grad-7" },
  { id: "9to5google", name: "9to5Google", slug: "9to5google", url: "https://9to5google.com", feedUrl: "https://9to5google.com/feed", type: "blog", category: "tech-news", initials: "9G", swatch: "thumb-grad-5" },
  { id: "hn", name: "Hacker News", slug: "hn", url: "https://news.ycombinator.com", feedUrl: "https://news.ycombinator.com/rss", type: "forum", category: "tech-news", initials: "HN", swatch: "thumb-grad-9" },
  { id: "techcrunch", name: "TechCrunch", slug: "techcrunch", url: "https://techcrunch.com", feedUrl: "https://techcrunch.com/feed", type: "publication", category: "tech-news", initials: "TC", swatch: "thumb-grad-5" },
  { id: "wired", name: "Wired", slug: "wired", url: "https://wired.com", feedUrl: "https://wired.com/feed/rss", type: "publication", category: "tech-news", initials: "Wi", swatch: "thumb-grad-1" },
  { id: "arstech", name: "Ars Technica", slug: "arstech", url: "https://arstechnica.com", feedUrl: "https://arstechnica.com/feed/", type: "publication", category: "tech-news", initials: "Ar", swatch: "thumb-grad-9" },

  // AI & Emerging Tools
  { id: "tldrai", name: "TLDR AI", slug: "tldrai", url: "https://tldr.tech/ai", type: "newsletter", category: "ai-tools", initials: "TA", swatch: "thumb-grad-7" },
  { id: "bensbites", name: "Ben's Bites", slug: "bensbites", url: "https://bensbites.com", type: "newsletter", category: "ai-tools", initials: "BB", swatch: "thumb-grad-9" },
  { id: "rundownai", name: "The Rundown AI", slug: "rundownai", url: "https://therundown.ai", type: "newsletter", category: "ai-tools", initials: "RA", swatch: "thumb-grad-6" },
  { id: "futureux", name: "Future of UX Podcast", slug: "futureux", url: "https://futureofux.com", feedUrl: "https://futureofux.com/feed", type: "podcast", category: "ai-tools", initials: "FU", swatch: "thumb-grad-7" },
  { id: "importai", name: "Import AI", slug: "importai", url: "https://importai.net", feedUrl: "https://importai.net/feed", type: "newsletter", category: "ai-tools", initials: "IA", swatch: "thumb-grad-6" },

  // General Newsletters
  { id: "morningbrew", name: "Morning Brew", slug: "morningbrew", url: "https://morningbrew.com", type: "newsletter", category: "newsletters", initials: "MB", swatch: "thumb-grad-4" },
  { id: "tldr", name: "TLDR", slug: "tldr", url: "https://tldr.tech", type: "newsletter", category: "newsletters", initials: "TL", swatch: "thumb-grad-1" },
  { id: "tldrdesign", name: "TLDR Design", slug: "tldrdesign", url: "https://tldr.tech/design", type: "newsletter", category: "newsletters", initials: "TD", swatch: "thumb-grad-2" },
  { id: "uxdw", name: "UX Design Weekly", slug: "uxdw", url: "https://uxdesignweekly.com", feedUrl: "https://uxdesignweekly.com/feed", type: "newsletter", category: "newsletters", initials: "UW", swatch: "thumb-grad-3" },
  { id: "figmalion", name: "Figmalion", slug: "figmalion", url: "https://figmalion.com", type: "newsletter", category: "newsletters", initials: "Fg", swatch: "thumb-grad-2" },

  // Podcasts
  { id: "designbetter", name: "Design Better", slug: "designbetter", url: "https://designbetter.co/podcast", type: "podcast", category: "podcasts", initials: "DB", swatch: "thumb-grad-3" },
  { id: "designdetails", name: "Design Details", slug: "designdetails", url: "https://designdetails.fm", type: "podcast", category: "podcasts", initials: "DD", swatch: "thumb-grad-1" },
  { id: "99pi", name: "99% Invisible", slug: "99pi", url: "https://99percentinvisible.org", feedUrl: "https://99percentinvisible.org/feed/", type: "podcast", category: "podcasts", initials: "99", swatch: "thumb-grad-9" },
  { id: "designmatters", name: "Design Matters", slug: "designmatters", url: "https://designmattersmedia.com", type: "podcast", category: "podcasts", initials: "DM", swatch: "thumb-grad-4" },
  { id: "uibreakfast", name: "UI Breakfast", slug: "uibreakfast", url: "https://uibreakfast.com/podcast", type: "podcast", category: "podcasts", initials: "UB", swatch: "thumb-grad-4" },
  { id: "honestux", name: "Honest UX Talks", slug: "honestux", url: "https://honestuxtalks.com", type: "podcast", category: "podcasts", initials: "HU", swatch: "thumb-grad-8" },
  { id: "nngpod", name: "NN/g UX Podcast", slug: "nngpod", url: "https://nngroup.com/podcast", type: "podcast", category: "podcasts", initials: "NP", swatch: "thumb-grad-2" },
  { id: "futurpod", name: "The Futur Podcast", slug: "futurpod", url: "https://thefutur.com/podcast", type: "podcast", category: "podcasts", initials: "TF", swatch: "thumb-grad-1" },
  { id: "highres", name: "High Resolution", slug: "highres", url: "https://highresolution.design", type: "podcast", category: "podcasts", initials: "HR", swatch: "thumb-grad-5" },
  { id: "hackingui", name: "Hacking UI", slug: "hackingui", url: "https://hackingui.com", type: "podcast", category: "podcasts", initials: "HU", swatch: "thumb-grad-6" },
];

export const CATEGORY_META: Record<
  SourceCategory,
  { label: string; short: string; dotVar: string }
> = {
  "design-tools": { label: "Design Tools", short: "Tools", dotVar: "var(--color-cat-design)" },
  "ux-thinking": { label: "UX & Thinking", short: "Thinking", dotVar: "var(--color-cat-thinking)" },
  inspiration: { label: "Inspiration", short: "Inspo", dotVar: "var(--color-cat-inspiration)" },
  youtube: { label: "Video", short: "Video", dotVar: "var(--color-cat-youtube)" },
  product: { label: "Product & Startup", short: "Product", dotVar: "var(--color-cat-product)" },
  "tech-news": { label: "Tech News", short: "Tech", dotVar: "var(--color-cat-tech)" },
  "ai-tools": { label: "AI & Tools", short: "AI", dotVar: "var(--color-cat-ai)" },
  newsletters: { label: "Newsletters", short: "Newsletters", dotVar: "var(--color-cat-newsletters)" },
  podcasts: { label: "Podcasts", short: "Podcasts", dotVar: "var(--color-cat-podcasts)" },
};

export const sourceById = (id: string) =>
  SOURCES.find((s) => s.id === id) ?? SOURCES[0];
