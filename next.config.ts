import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  webpack: (config, { dev, isServer }) => {
    // Disable HMR in development to avoid chunk loading errors in iframe
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 2000,
      }
    }
    return config
  },
  // Disable Turbopack HMR for iframe compatibility
  experimental: {
    turbopackOptions: {
      resolveAlias: {},
    },
  },
}

export default nextConfig
