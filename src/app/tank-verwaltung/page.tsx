"use client";
import TankManagement from '@/components/inventory/tank-management';

export default function TankVerwaltungPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-sans text-3xl md:text-4xl text-primary">Tank-Verwaltung</h1>
        <p className="text-muted-foreground mt-2">Tanks und Gebinde verwalten, QR-Codes generieren.</p>
      </div>
      <TankManagement />
    </main>
  );
}
