/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    return config
  },
  async redirects() {
    return [
      // Redirect all easystitch.org traffic → craftwabi.com (permanent 301)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'easystitch.org' }],
        destination: 'https://craftwabi.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.easystitch.org' }],
        destination: 'https://craftwabi.com/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
