import { Suspense } from 'react';
import RezepturEditor from '@/components/rezeptur-editor';

export default function RezepturEditorPage() {
  return (
    <div className="p-4 container mx-auto max-w-4xl">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Lädt…</div>}>
        <RezepturEditor />
      </Suspense>
    </div>
  );
}
