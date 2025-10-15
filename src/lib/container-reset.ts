/**
 * Container-Reset-Tool
 * Löscht ALLE Container-Definitionen und erstellt sie neu aus dem Inventar
 */

import { hybridStorage } from './hybrid-storage';

export async function resetAllContainers(): Promise<{success: boolean, message: string, count: number}> {
  try {
    console.log('🔄 Starte Container-Reset...');
    
    // Lösche alle bestehenden Container
    await hybridStorage.set('tankDefinitions', []);
    console.log('✅ Alle Container gelöscht');
    
    // Trigger Re-Sync (wird automatisch beim nächsten Load ausgeführt)
    window.dispatchEvent(new CustomEvent('tankDefinitionsReset'));
    
    return {
      success: true,
      message: 'Alle Container wurden gelöscht. Bitte App neu laden.',
      count: 0
    };
  } catch (error) {
    console.error('❌ Container-Reset fehlgeschlagen:', error);
    return {
      success: false,
      message: `Fehler: ${error}`,
      count: 0
    };
  }
}

export async function getContainerStats(): Promise<{
  total: number,
  autoDetected: number,
  manual: number,
  filled: number,
  empty: number
}> {
  const containers = (await hybridStorage.get('tankDefinitions')) || [];
  
  const autoDetected = containers.filter((c: any) => 
    c.bezeichnung?.includes('Auto-erkannt') || 
    (c.bezeichnung?.includes('(') && c.bezeichnung?.includes(')'))
  ).length;
  
  const filled = containers.filter((c: any) => c.status === 'filled').length;
  const empty = containers.filter((c: any) => c.status === 'empty' || !c.status).length;
  
  return {
    total: containers.length,
    autoDetected,
    manual: containers.length - autoDetected,
    filled,
    empty
  };
}
