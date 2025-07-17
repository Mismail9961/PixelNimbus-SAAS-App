import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: [
      'ik.imagekit.io',
      'img.clerk.com',
      'images.clerk.dev',
      // Add other domains you use for images here
    ],
    // Alternative: Use remotePatterns (recommended for newer Next.js versions)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig