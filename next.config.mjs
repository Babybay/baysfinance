/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
