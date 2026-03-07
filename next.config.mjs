/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-5d46654b7ae246ccababc4ece9ce8590.r2.dev',
      },
    ],
  },
  output: 'standalone',
};

export default nextConfig;
