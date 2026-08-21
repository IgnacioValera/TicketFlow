import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.join(__dirname),
  },
  // Avoid restoring stale client pages after mutations (e.g. create user → list).
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  // App Router treats `_…` folders as private; keep the legacy e2e URL via rewrite.
  async rewrites() {
    return [{ source: '/__render-error', destination: '/dev/render-error' }]
  },
  // Reduce Playwright noise from the floating Next.js overlay.
  devIndicators: false,
}

export default nextConfig
