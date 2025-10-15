


import CalendarWidget from '@/components/dashboard/CalendarWidget';
import TaskWidget from '@/components/dashboard/TaskWidget';
import { Suspense } from 'react';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-sans text-3xl md:text-4xl text-primary">Dashboard</h1>
        <p className="text-gray-600 mt-4">Willkommen bei MazerationsMeister</p>
      </div>
      
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Suspense fallback={<div className="p-6 bg-white rounded-lg shadow-md">Kalender lädt...</div>}>
              <CalendarWidget />
            </Suspense>
          </div>
          
          <div className="md:col-span-2">
            <Suspense fallback={<div className="p-6 bg-white rounded-lg shadow-md">Aufgaben laden...</div>}>
              <TaskWidget />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

