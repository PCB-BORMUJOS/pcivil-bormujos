/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'public.blob.vercel-storage.com'],
  },
}

module.exports = nextConfig
