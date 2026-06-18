import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
  outputFileTracingRoot: path.join(frontendRoot, ".."),
};

export default nextConfig;
