
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Static Export für Electron
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true
  },
  // Electron-optimierte Konfiguration
  compress: false,
  poweredByHeader: false,
};

export default nextConfig;
