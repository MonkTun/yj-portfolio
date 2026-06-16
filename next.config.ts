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
  experimental: {
    // The admin upload route (/api/admin/*) is matched by src/proxy.ts, so Next
    // clones the request body for the proxy layer. That clone defaults to a
    // 10 MB cap — anything larger gets truncated mid-stream, which corrupts the
    // multipart payload and makes req.formData() throw "Invalid form data" in
    // the upload route. Raise it to match the route's own 25 MB MAX_BYTES so
    // large image uploads reach the handler intact.
    proxyClientMaxBodySize: 25 * 1024 * 1024,
  },
};

export default nextConfig;
