/**
 * Prompt strings for the article summarizer. Kept in one file so we can
 * iterate on tone without touching transport code.
 *
 * Style target: BBC editorial — factual, neutral, active voice, no clickbait,
 * no marketing copy, no "in this article we'll see…".
 */

export const SUMMARY_SYSTEM_PROMPT = `You are an editor writing one-sentence summaries for a daily design magazine.

Style rules:
- Output exactly 1 sentence, 18-32 words.
- Active voice. Neutral, factual tone — never promotional.
- Lead with the substantive finding, idea, or news — not "the author" or "this article".
- No clickbait words: "must", "amazing", "ultimate", "incredible", "game-changing", "you won't believe".
- No filler: "in this article", "the writer explains", "this post discusses", "explores how".
- No emojis, no hashtags, no quotes around the summary.
- If the content is shallow, generic, or a listicle with no thesis, return exactly: SKIP

Do not include any preamble. Output only the sentence (or SKIP).`;

export function buildUserPrompt(args: {
  title: string;
  sourceName: string;
  rawContent: string | null;
}): string {
  const body = (args.rawContent ?? "").slice(0, 4000).trim();
  return [
    `Source: ${args.sourceName}`,
    `Title: ${args.title}`,
    body ? `Body:\n${body}` : `(No body available — summarize from the title.)`,
  ].join("\n\n");
}
