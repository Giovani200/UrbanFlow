import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://api.maptiler.com",
              "img-src 'self' data: blob: https://api.maptiler.com https://*.maptiler.com",
              "font-src 'self'",
              `connect-src 'self' https://api.maptiler.com https://*.maptiler.com ${apiOrigin}`,
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision: crypto.randomUUID() }],
});

export default withSerwist(nextConfig);
