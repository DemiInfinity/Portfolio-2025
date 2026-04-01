/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.demitaylornimmo.com', 'demitaylornimmo.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
