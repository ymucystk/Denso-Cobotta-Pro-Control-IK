import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  trailingSlash: true,
//  assetPrefix: "/cobotta",
//  basePath: "/cobotta",
  env: {
    NEXT_BASE_PATH: "",
  }
};

export default nextConfig;
