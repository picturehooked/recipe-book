/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 768, 1024, 1280, 1536],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
