import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Home, FlaskConical, Warehouse, Settings, BookOpen, Package, QrCode, LayoutGrid, Beaker, TrendingUp, FileText } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/mazerationen', label: 'Mazerationen', icon: FlaskConical },
  { href: '/inventory', label: 'Lagerverwaltung', icon: Warehouse },
  { href: '/gebindeverwaltung', label: 'Gebindeverwaltung', icon: Package },
  { href: '/rezepturen', label: 'Rezepturen', icon: Beaker },
  { href: '/reichweite', label: 'Reichweitenanalyse', icon: TrendingUp },
  { href: '/qr-album', label: 'QR-Code Album', icon: LayoutGrid },
  { href: '/tank-overview', label: 'Tank-Übersicht', icon: QrCode },
  { href: '/anleitungen', label: 'Anleitungen', icon: BookOpen },
  { href: '/einstellungen', label: 'Einstellungen', icon: Settings },
  { href: '/dokumente', label: 'Dokumente', icon: FileText },
];

export default function Sidebar() {
  return (
  <aside className="bg-card border-r border-border min-h-screen w-64 flex flex-col fixed top-0 left-0 h-screen z-40 hidden lg:flex">
      <div className="h-16 flex items-center justify-center border-b border-border">
        <span className="text-2xl font-bold text-primary">MazerationsMeister</span>
      </div>
      <nav className="flex-1 flex flex-col gap-2 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-2 rounded-md text-base font-medium text-primary hover:bg-accent transition-colors',
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
