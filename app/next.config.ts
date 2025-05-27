// @ts-check
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  transpilePackages: [
    "@protspace/core",
    "@protspace/utils",
    "@protspace/react",
  ],
  webpack: (config) => {
    // Handle web components and custom elements
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules/,
      exclude: /node_modules[/\\](?!@lit|lit|lit-element|lit-html|@protspace)/,
      type: "javascript/auto",
    });
    return config;
  },
};

export default nextConfig;
