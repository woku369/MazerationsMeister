
"use client";
import InventoryManagement from '@/components/inventory/inventory-management';

export default function InventoryPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-sans text-3xl md:text-4xl text-primary">Lagerverwaltung</h1>
        <p className="text-muted-foreground mt-2">Übersicht und Verwaltung Ihrer Lagerbestände.</p>
      </div>
      <InventoryManagement />
    </main>
  );
}
