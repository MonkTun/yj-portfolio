import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Pin the workspace root to this project so Next/Turbopack don't walk up the
// filesystem looking for an ambient package.json (which historically caused
// Tailwind module resolution to fail in dev).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
