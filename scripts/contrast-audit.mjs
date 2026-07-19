/**
 * Contrast regression check — WCAG 2.1 ratios for every token pair the UI and
 * the email actually use. Values mirror globals.css + lib/newsletter.ts; if
 * you change a token, change it here too (the pair going stale IS the alarm).
 *
 * Run: npm run audit:contrast   (exits 1 on any failure)
 * Origin: dark-mode audit 2026-07-19 — night rules sat at 1.30:1 (invisible),
 * shadows at 2.05:1, and Gmail's dark transform broke alpha-composited email
 * text. TEXT needs ≥4.5, GRAPHICS (borders/dots/shadows) ≥3.
 */
function lum(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(fg, bg) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const TEXT = 4.5;
const GFX = 3;

const PAIRS = [
  // ── Site · morning (light) ──
  ["light: ink on paper", "#1a1340", "#f5f0e8", TEXT],
  ["light: muted on paper", "#5c5470", "#f5f0e8", TEXT],
  ["light: subtle on paper", "#6f677f", "#f5f0e8", TEXT],
  ["light: card ink on cream card", "#1a1340", "#fffdf7", TEXT],
  ["light: card subtle on cream card", "#6b6480", "#fffdf7", TEXT],
  ["light: card accent on cream card", "#5b3df5", "#fffdf7", TEXT],
  ["light: nav ink on purple bar", "#f5f0e8", "#5b3df5", TEXT],

  // ── Site · night (dark) ──
  ["dark: ink on canvas", "#f5f0e8", "#0f0a2a", TEXT],
  ["dark: muted on canvas", "#c4bdd3", "#0f0a2a", TEXT],
  ["dark: subtle on canvas", "#9b93a8", "#0f0a2a", TEXT],
  ["dark: accent on canvas", "#9e8cff", "#0f0a2a", TEXT],
  ["dark: rule vs canvas", "#675aad", "#0f0a2a", GFX],
  ["dark: card shadow vs canvas", "#6455d6", "#0f0a2a", GFX],
  ["dark: card ink on night card", "#f5f0e8", "#1e1550", TEXT],
  ["dark: card muted on night card", "#c4bdd3", "#1e1550", TEXT],
  ["dark: card subtle on night card", "#9b93a8", "#1e1550", TEXT],
  ["dark: card accent on night card", "#b9abff", "#1e1550", TEXT],
  ["dark: card border vs night card", "#7668c2", "#1e1550", GFX],
  ["dark: nav ink on night bar", "#f5f0e8", "#1a1340", TEXT],
  ["dark: marquee lime on band", "#d4ff3f", "#2a1f6e", TEXT],
  // night dot palette (vivid stripes) on the night card
  ["dark dot: design", "#d4ff3f", "#1e1550", GFX],
  ["dark dot: thinking", "#7c6bf5", "#1e1550", GFX],
  ["dark dot: inspiration", "#4fffb0", "#1e1550", GFX],
  ["dark dot: youtube", "#ff5252", "#1e1550", GFX],
  ["dark dot: product", "#ff4fd8", "#1e1550", GFX],
  ["dark dot: tech", "#00e5ff", "#1e1550", GFX],
  ["dark dot: ai", "#ffb800", "#1e1550", GFX],
  ["dark dot: newsletters", "#b06bff", "#1e1550", GFX],
  ["dark dot: podcasts", "#ff6b6b", "#1e1550", GFX],
  // fixed-color elements
  ["fixed: navy on lime (chips/badges)", "#1a1340", "#d4ff3f", TEXT],
  ["fixed: cream on navy (toast/✕)", "#fffaf0", "#1a1340", TEXT],
  // paper-token glyphs on the accent (ScrollTop, About chips, feedback submit):
  // paper flips with the theme so the glyph always opposes the accent.
  ["light: paper glyph on accent", "#f5f0e8", "#5b3df5", TEXT],
  ["dark: paper glyph on accent", "#0f0a2a", "#9e8cff", TEXT],
  ["dark: paper glyph on in-card accent", "#0f0a2a", "#b9abff", TEXT],

  // ── Email · authored light edition ("one template, two editions": the
  //    porcelain palette is DESIGNED so Gmail-dark's inversion lands on the
  //    brand night palette; these are the authored-light pairs) ──
  ["email: edition name navy on porcelain", "#1a1340", "#f7f5ff", TEXT],
  ["email: title navy on porcelain", "#1a1340", "#f7f5ff", TEXT],
  ["email: intro on porcelain", "#3f3556", "#f7f5ff", TEXT],
  ["email: summary gray on porcelain", "#5c5470", "#f7f5ff", TEXT],
  ["email: byline on porcelain", "#6b6382", "#f7f5ff", TEXT],
  ["email: chip cream on purple", "#fffaf0", "#5b3df5", TEXT],
  ["email: Read btn cream on purple", "#fffaf0", "#5b3df5", TEXT],
  ["email: CTA cream on navy band", "#fffaf0", "#1a1340", TEXT],
  // Footer text sits high-L* on purpose: Gmail's flip previously landed the
  // #9e8cff links LIGHT on the pale inverted band (field evidence 2026-07-19)
  // — cream links flip near-black instead.
  ["email: footer text on navy", "#e3def0", "#1a1340", TEXT],
  ["email: footer links cream on navy", "#fffaf0", "#1a1340", TEXT],
  // email · Apple Mail night edition (dm- classes on #0f0a2a card)
  ["email dark: title on canvas", "#f0ecff", "#0f0a2a", TEXT],
  ["email dark: summary on canvas", "#b6aecf", "#0f0a2a", TEXT],
  ["email dark: byline lavender on canvas", "#9e8cff", "#0f0a2a", TEXT],
  ["email dark: chip navy on lime", "#1a1340", "#d4ff3f", TEXT],
];

let failed = 0;
for (const [label, fg, bg, need] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= need;
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(6)} (need ${need})  ${label}  [${fg} on ${bg}]`
  );
}
console.log(
  failed === 0
    ? `\nAll ${PAIRS.length} pairs pass.`
    : `\n${failed}/${PAIRS.length} pairs FAILED.`
);
process.exit(failed === 0 ? 0 : 1);
