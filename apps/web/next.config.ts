import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages are consumed from their built output.
  transpilePackages: ["@resume-judge/types"],
};

export default nextConfig;
