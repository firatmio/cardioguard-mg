import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Standalone output for Docker deploy
  output: "standalone",

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_BASE_URL ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin : 'http://localhost:8000'} https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.com https://*.firebaseapp.com`,
              "frame-src 'self' https://*.firebaseapp.com",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Remove Powered-by header
  poweredByHeader: false,
};

export default nextConfig;
