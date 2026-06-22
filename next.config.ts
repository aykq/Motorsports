import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "www.gt-world-challenge-europe.com" },
      { protocol: "https", hostname: "www.gt4europeanseries.com" },
      { protocol: "https", hostname: "www.fiawec.com" },
      { protocol: "https", hostname: "photos.motogp.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cdn-8.motorsport.com" },
      { protocol: "https", hostname: "cdn-4.motorsport.com" },
      { protocol: "https", hostname: "cdn-1.motorsport.com" },
      { protocol: "https", hostname: "cdn-2.motorsport.com" },
      { protocol: "https", hostname: "cdn-3.motorsport.com" },
      { protocol: "https", hostname: "cdn-5.motorsport.com" },
      { protocol: "https", hostname: "cdn-6.motorsport.com" },
      { protocol: "https", hostname: "cdn-7.motorsport.com" },
      { protocol: "https", hostname: "cdn.motorsport.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
