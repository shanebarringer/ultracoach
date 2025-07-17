import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Ignore pg-native module since it's not available in browser environments
    config.resolve.alias = {
      ...config.resolve.alias,
      'pg-native': false,
    };
    return config;
  },
};

export default nextConfig;
