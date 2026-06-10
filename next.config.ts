import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // No legitimate embedder — block clickjacking via framing.
          { key: "X-Frame-Options", value: "DENY" },
          // Never MIME-sniff responses.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send origin-only referrer cross-origin (we link out constantly).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // We use none of these — deny by default.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
