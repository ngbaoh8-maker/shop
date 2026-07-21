/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.vietqr.io' }
    ]
  }
};

export default nextConfig;
