
import type {Metadata, Viewport} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import AppDataInitializer from '@/components/app-data-initializer';
import { cn } from '@/lib/utils';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MazerationsMeister',
  description: 'Professionelle Tank-Verwaltung für Mazerationen mit OneDrive-Sync',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.ico',
    apple: '/images/gurktaler-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MazerationsMeister',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#667eea',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable} suppressHydrationWarning={true}>
      <head>
        <link rel="icon" href="/icon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MazerationsMeister" />
      </head>
      <body className={cn(
        "font-sans antialiased min-h-screen bg-background"
      )} suppressHydrationWarning={true}>
        <AppDataInitializer>
          <div className="flex flex-row min-h-screen">
            <Sidebar />
            {/* min-w-0 ist hier Pflicht: Ein flex-1-Kind in einem flex-row-
                Container weigert sich per CSS-Default (min-width: auto),
                unter die Breite seines Inhalts zu schrumpfen. Breite
                Tabellen tief im Baum (z.B. Lagerverwaltung) haben dadurch
                die gesamte Seite horizontal überlaufen lassen, statt dass
                nur die innere ScrollArea scrollt - der horizontale
                Scrollbalken dort erreichte deshalb nie das Tabellenende
                (Nutzer-Meldung 30.10.2026). */}
            <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
              <AppHeader />
              <main className="flex-1 min-w-0">
                {children}
              </main>
              <Toaster />
            </div>
          </div>
        </AppDataInitializer>
      </body>
    </html>
  );
}
