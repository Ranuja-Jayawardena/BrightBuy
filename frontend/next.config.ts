import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com',
        pathname: '/products/**',
      },
    ],
  },
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
    const rawTarget =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000";
    const destination = rawTarget.endsWith("/api/:path*")
      ? rawTarget
      : `${rawTarget.replace(/\/+$/, "")}/api/:path*`;

    return [
      {
        source: "/api/:path*",
        destination,
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
