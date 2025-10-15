'use client';

import TankManagement from '@/components/inventory/tank-management';

export default function GebindeverwaltungPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">📦 Gebindeverwaltung</h1>
        <p className="text-muted-foreground mt-2">
          Verwaltung aller physischen Behälter mit QR-Codes und Lifecycle-Tracking
        </p>
      </div>
      <TankManagement />
    </div>
  );
}
