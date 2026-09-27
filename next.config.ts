import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // jose ships ESM-only; without this, Jest (via next/jest) can't transform
  // it and throws "Must use import to load ES Module" for any test that
  // touches src/lib/auth.ts.
  transpilePackages: ["jose"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
      },
    ],
  },
};

export default nextConfig;
