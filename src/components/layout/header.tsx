
"use client";

import Link from 'next/link';
import { Home, Warehouse, BookOpen, Menu, Settings, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import BrandMark from './brand-mark';

export default function AppHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/mazerationen', label: 'Mazerationen', icon: FlaskConical },
    { href: '/inventory', label: 'Lagerverwaltung', icon: Warehouse },
    { href: '/anleitungen', label: 'Anleitungen', icon: BookOpen },
    { href: '/einstellungen', label: 'Einstellungen', icon: Settings },
  ];

  const mainNavItems = [
    { href: '/?resetForm=true', label: 'Neues Protokoll', icon: Home },
    { href: '/inventory', label: 'Lagerverwaltung', icon: Warehouse },
    { href: '/anleitungen', label: 'Anleitungen', icon: BookOpen },
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="h-16 flex items-center px-4 border-b border-border">
                <BrandMark showVersion />
              </div>
              <nav className="flex flex-col gap-2 p-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 rounded-md text-base font-medium text-primary hover:bg-accent transition-colors',
                      pathname === item.href && "bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo nur, solange die Sidebar ausgeblendet ist (unter lg) - auf
              dem Desktop steht es bereits oben in der Sidebar (Nutzer-Wunsch
              01.11.2026: Name nur einmal, mit Icon und Logo). */}
          <BrandMark size="sm" className="lg:hidden" />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-2">
          {mainNavItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href.split('?')[0] && !item.href.includes('resetForm') ? "secondary" : "ghost"}
              asChild
              className={cn(
                pathname === item.href.split('?')[0] && !item.href.includes('resetForm') && "font-semibold"
              )}
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
