
"use client";

import Link from 'next/link';
import { Home, Warehouse, BookOpen, Menu, Settings, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
              <div className="h-16 flex items-center justify-center border-b border-border">
                <span className="text-xl font-bold text-primary">MazerationsMeister</span>
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

          <Link href="/" className="text-lg lg:text-3xl font-bold text-primary hover:text-primary/90 transition-colors">
            <span className="hidden sm:inline">Mazerations-Meister V 1.0</span>
            <span className="sm:hidden">MM V1.0</span>
          </Link>
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
