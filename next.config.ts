
import type {NextConfig} from 'next';

// Build-Info (Version, Build-Nummer, Git-Commit) vor jedem Next.js-Start neu
// erzeugen - deckt dadurch `next dev`, `next build` und alle davon
// abhängigen Build-Skripte (electron-build, build-portable, build-fast)
// einheitlich ab, ohne den Schritt an mehreren Stellen verdrahten zu müssen.
// Schlägt die Erzeugung fehl (z.B. kein Git verfügbar), darf das den
// eigentlichen Next.js-Start nicht verhindern - daher defensiv.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./scripts/generate-build-info.js').generateBuildInfo();
} catch (e) {
  console.warn('⚠️ Build-Info konnte nicht erzeugt werden:', e);
}

const nextConfig: NextConfig = {
  // Static Export für Electron
  output: 'export',
  trailingSlash: true,
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
