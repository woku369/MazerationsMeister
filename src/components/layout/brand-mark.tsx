import Link from 'next/link';
import { cn } from '@/lib/utils';
import buildInfo from '@/build-info.json';

/**
 * App-Identität nach Meister-Suite-CI (C:\Users\wolfg\Desktop\CI VS):
 * glassy Icon + Wortmarke in Eskapade Fraktur, "Mazerations" schwarz,
 * "Meister" in der App-Farbe Tiefviolett. Ersetzt die frühere Doppelung aus
 * Sidebar-Titel und "Mazerations-Meister v… Build …" in der Kopfzeile
 * (Nutzer-Wunsch 01.11.2026: einmal reicht, mit Icon und Logo).
 */
export default function BrandMark({ size = 'md', showVersion = false, className }: {
  size?: 'sm' | 'md';
  showVersion?: boolean;
  className?: string;
}) {
  const iconPx = size === 'md' ? 36 : 32;
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-2.5 min-w-0', className)}
      title={`MazerationsMeister v${buildInfo.version} · Build ${buildInfo.buildNumber} · ${buildInfo.gitCommit}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/mazerationsmeister-icon-128.png"
        srcSet="/branding/mazerationsmeister-icon-128.png 1x, /branding/mazerationsmeister-icon-256.png 2x"
        alt=""
        width={iconPx}
        height={iconPx}
        className="shrink-0"
      />
      <span className="flex flex-col min-w-0 leading-none">
        <span
          className={cn('font-fraktur whitespace-nowrap', size === 'md' ? 'text-[1.4rem]' : 'text-xl')}
          style={{ color: 'var(--meister-black)' }}
        >
          Mazerations<span style={{ color: 'var(--meister-mazeration)' }}>Meister</span>
        </span>
        {showVersion && (
          <span className="mt-1 text-[11px] text-muted-foreground whitespace-nowrap">
            v{buildInfo.version} · Build {buildInfo.buildNumber}
          </span>
        )}
      </span>
    </Link>
  );
}
