/** @type {import('next').NextConfig} */
const storageHostname = process.env.MINIO_HOSTNAME || process.env.R2_HOSTNAME;

const nextConfig = {
  images: {
    remotePatterns: storageHostname
      ? [
          {
            protocol: 'https',
            hostname: storageHostname,
          },
        ]
      : [],
  },
  output: 'standalone',
  serverExternalPackages: ['tesseract.js', 'pdf-parse'],
};

export default nextConfig;
