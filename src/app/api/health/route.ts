import { NextRequest, NextResponse } from 'next/server';

// Für statischen Export: Route als statische Funktion konfigurieren
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    app: 'MazerationsMeister',
    version: '1.0'
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
