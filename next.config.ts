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
        source: '/neat',
        destination: '/oem/neat',
        permanent: true,
      },
      {
        source: '/logitech',
        destination: '/oem/logitech',
        permanent: true,
      },
      {
        source: '/poly',
        destination: '/oem/poly',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
