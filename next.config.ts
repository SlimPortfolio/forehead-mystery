import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json in the
  // parent devprojects folder otherwise makes Turbopack infer that whole
  // directory as the root and watch every sibling project, which slows and
  // destabilizes the dev server.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
