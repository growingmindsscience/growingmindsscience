import type { NextConfig } from "next";

// Served under growingmindsscience.com/nsc via multi-zone rewrite from the
// static site's vercel.json (see nsc/README.md for the wiring step).
const nextConfig: NextConfig = {
  basePath: "/nsc",
  reactStrictMode: true,
};

export default nextConfig;
