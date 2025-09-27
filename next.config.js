/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    optimizePackageImports: ["axios", "@headlessui/react", "@heroicons/react"],
  },

  // Environment variables
  env: {
    VITE_API_URL: process.env.VITE_API_URL,
    VITE_TENANT: process.env.VITE_TENANT,
  },

  // API rewrites for development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.VITE_API_URL || "https://localhost:8443/fineract-provider"
        }/:path*`,
      },
    ];
  },

  // Image optimization
  images: {
    domains: ["localhost"],
    unoptimized: true, // Disable for development with self-signed certs
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle client-side only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Output configuration
  output: "standalone",

  // Disable x-powered-by header
  poweredByHeader: false,

  // Compression
  compress: true,

  // Strict mode
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
