import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kfqudsvjqszfumjndunn.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/logitech',
        destination: '/oem/logitech',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
