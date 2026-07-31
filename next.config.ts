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
      { protocol: "https", hostname: "cdn-*.motorsport.com" },
      { protocol: "https", hostname: "cdn.motorsport.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
