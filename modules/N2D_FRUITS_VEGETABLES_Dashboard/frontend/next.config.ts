import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/vegetables-fruits',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
