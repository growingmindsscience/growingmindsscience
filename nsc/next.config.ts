import type { NextConfig } from "next";

// Served under growingmindsscience.com/nsc via multi-zone rewrite from the
// static site's vercel.json (see nsc/README.md for the wiring step).
const nextConfig: NextConfig = {
  basePath: "/nsc",
  reactStrictMode: true,
  // In production the static site owns every path outside /nsc and proxies
  // /nsc here. On a preview or bare deployment host nothing serves those
  // pages, so links to the class catalog or the AI tool would 404. Send them
  // to the public site instead.
  async redirects() {
    return ["classes", "tools"].flatMap((section) => [
      { source: `/${section}`, destination: `https://growingmindsscience.com/${section}/`, basePath: false as const, permanent: false },
      { source: `/${section}/:path+`, destination: `https://growingmindsscience.com/${section}/:path+`, basePath: false as const, permanent: false },
    ]);
  },
  // The runtime reads the frozen content + cert report by raw bytes (hash
  // verification), via a computed path Next's tracer won't follow. Force the
  // files into every serverless function bundle so prod reads don't ENOENT.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*.json"],
  },
};

export default nextConfig;
