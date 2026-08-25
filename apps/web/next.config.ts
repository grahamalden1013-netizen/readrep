import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source directly (no build step in
  // Phase 0), so Next must transpile them. See docs/adr/0001-monorepo.md.
  transpilePackages: [
    "@readrep/ai",
    "@readrep/domain",
    "@readrep/evals",
    "@readrep/observability",
    "@readrep/orchestrator",
    "@readrep/video",
    "@readrep/vision",
  ],
};

export default nextConfig;
