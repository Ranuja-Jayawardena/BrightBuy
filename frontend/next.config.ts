import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hot reload inside Docker: file-change events from Windows/macOS bind mounts don't
  // reach the container, so we must poll. Turbopack does not support polling, so
  // docker-compose overrides the command to use Webpack (`next dev --webpack`) and
  // sets WATCHPACK_POLLING.
  ...(process.env.WATCHPACK_POLLING === "true"
    ? {
        webpack(config, { dev }) {
          if (dev) {
            config.watchOptions = {
              poll: 1000,
              aggregateTimeout: 300,
            };
          }
          return config;
        },
      }
    : {}),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.BACKEND_URL || "http://localhost:5000/api/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/products',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
