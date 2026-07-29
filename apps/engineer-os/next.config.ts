import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isEmbed = process.env.ENGINEEROS_STATIC_EXPORT === "1" || basePath === "/engineer-os";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // Always static-export when embedding under live DSA Mantra
  output: isEmbed ? "export" : process.env.ENGINEEROS_STATIC_EXPORT === "1" ? "export" : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Monorepo: avoid picking parent lockfile as Turbopack root
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
