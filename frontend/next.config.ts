import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Movie posters / trailers come from the catalog; allow remote hosts.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}

export default nextConfig
