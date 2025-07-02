// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias.canvas   = false
    config.resolve.alias.encoding = false
    return config
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // use IPv4 loopback here!
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
