import { ImageResponse } from "next/og";

/**
 * Social share card (og:image + reused for twitter:image via metadata).
 * Generated at the edge — purple brand canvas, lime pixel-style wordmark
 * with a hard offset shadow, cream tagline. No external font fetch: the
 * blocky look comes from weight + the offset shadow, which keeps this
 * dependency-free and fast.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Designator — your daily design briefing";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#5b3df5",
        }}
      >
        <div
          style={{
            fontSize: 130,
            fontWeight: 800,
            letterSpacing: "-2px",
            color: "#d4ff3f",
            textShadow: "8px 8px 0 #1a1340",
          }}
        >
          designator
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: "#f5f0e8",
            opacity: 0.9,
          }}
        >
          Your daily design briefing
        </div>
        {/* pixel corner accents */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            width: 28,
            height: 28,
            background: "#d4ff3f",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 40,
            width: 28,
            height: 28,
            background: "#ff4fd8",
            display: "flex",
          }}
        />
      </div>
    ),
    size
  );
}
