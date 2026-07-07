import type { NextConfig } from "next";

// Served under growingmindsscience.com/nsc via multi-zone rewrite from the
// static site's vercel.json (see nsc/README.md for the wiring step).
const nextConfig: NextConfig = {
  basePath: "/nsc",
  reactStrictMode: true,
  // The runtime reads the frozen content + cert report by raw bytes (hash
  // verification), via a computed path Next's tracer won't follow. Force the
  // files into every serverless function bundle so prod reads don't ENOENT.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*.json"],
  },
};

export default nextConfig;
