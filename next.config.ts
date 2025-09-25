// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // No frenes el build por ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // No frenes el build por errores de TS en producción
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
