/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@rag/shared'],
  async rewrites() {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
