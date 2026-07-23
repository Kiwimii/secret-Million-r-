import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const pagesBasePath = "/secret-Million-r-";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? pagesBasePath : undefined,
  assetPrefix: isGitHubPages ? pagesBasePath : undefined,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: isGitHubPages,
  },
};

export default nextConfig;
