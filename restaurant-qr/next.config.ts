import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Keep Next's resolver inside this app instead of the parent user's folder.
    root: process.cwd(),
  },
};

export default nextConfig;
