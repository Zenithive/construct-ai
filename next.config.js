/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcryptjs', 'nodemailer'],
  },
};

module.exports = nextConfig;
