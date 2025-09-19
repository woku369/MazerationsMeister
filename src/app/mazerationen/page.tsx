import MazerationForm from '@/components/mazeration-form';
import { Suspense } from 'react';

export default function MazerationenPage() {
  return (
    // main takes the sidebar into account: left margin equals sidebar width (w-64 = 16rem)
    // width is reduced so the inner container can be centered inside the available space
    <main className="px-4 py-8" style={{ marginLeft: '16rem', width: 'calc(100% - 16rem)' }}>
      <div className="container mx-auto">
        <div className="text-center mb-4">
    {/* BUILD-TAG removed for production UI */}
        </div>
        <div className="text-center mb-12">
          <h1 className="font-sans text-3xl md:text-4xl text-primary">Mazerationsprotokoll</h1>
        </div>
        <Suspense fallback={<div>Lädt...</div>}>
          <MazerationForm />
        </Suspense>
      </div>
    </main>
  );
}
