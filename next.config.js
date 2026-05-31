/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@flow-js/garmin-connect'],
  },
};
module.exports = nextConfig;
