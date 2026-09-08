import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) does its own dynamic module loading that
  // doesn't play well with Next's server bundler — keep it as a real
  // Node dependency instead of trying to bundle it.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
