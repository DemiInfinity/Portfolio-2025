/** @type {import('next').NextConfig} */
const nextConfig = {
  // PDFs served through the own-domain media route (the generated CV) are never indexed (D-5).
  async headers() {
    return [
      {
        source: '/media/:path(.*\\.pdf)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ]
  },
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
