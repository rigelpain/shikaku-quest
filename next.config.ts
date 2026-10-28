import type { NextConfig } from "next";

// GitHub Pages（静的サイト）向けのビルド設定。
// プロジェクトサイト (https://<user>.github.io/shikaku-quest/) では NEXT_PUBLIC_BASE_PATH=/shikaku-quest を渡す。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  // Cache Components / PPR は output: "export" と併用できない
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
