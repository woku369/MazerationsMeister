import type { TankDefinition, ContainerType } from '@/schemas/tankSchema';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import { hybridStorage } from './hybrid-storage';

/**
 * Synchronisiert Tank-Definitionen mit dem aktuellen Inventar
 * Neue Tank-Nummern aus dem Inventar werden automatisch zu den Tank-Definitionen hinzugefügt
 * 
 * WICHTIG: Async Funktion - verwendet hybridStorage (persistent Electron/Browser storage)
 */
export async function syncTankDefinitionsWithInventory(): Promise<void> {
  if (typeof window === 'undefined') return;

  // KRITISCHER FIX: Verwende hybridStorage (async) statt universalStorage (localStorage-only)
  const inventoryItems: StoredInventoryItem[] = (await hybridStorage.get('inventoryItems')) || [];
  const currentTanks: TankDefinition[] = (await hybridStorage.get('tankDefinitions')) || [];
  
  console.log('🔍 Tank-Sync Debug: Inventory Items gefunden:', inventoryItems?.length || 0);
  console.log('🔍 Tank-Sync Debug: Aktuelle Tanks:', currentTanks?.length || 0);
  
  if (!inventoryItems || inventoryItems.length === 0) {
    console.warn('⚠️ Tank-Sync: Keine Inventory-Daten gefunden!');
    return;
  }
  
  // KRITISCHE KORREKTUR: Bestehende Tank-IDs zu tankNr korrigieren und neue Felder hinzufügen
  const correctedTanks = currentTanks.map(tank => {
    // Bereinige die ID falls sie doppelt ist (z.B. "T 341(T 341)" → "T 341")
    let cleanId = tank.id;
    if (cleanId.includes('(')) {
      cleanId = cleanId.split('(')[0];
    }
    
    // Migration: Füge neue Felder hinzu falls sie fehlen
    const migrated: TankDefinition = {
      ...tank,
      id: tank.tankNr || cleanId, // Verwende tankNr oder bereinigte ID
      containerType: tank.containerType || (tank.tankNr?.match(/^T\s?\d+/i) ? 'tank' : 'other'), // Auto-detect: "T 341" = tank, rest = other
      hasUniqueNumber: tank.hasUniqueNumber ?? (tank.tankNr?.match(/^T\s?\d+/i) ? true : false) // Auto-detect: Tank mit T-Nummer = eindeutig
    };
    
    return migrated;
  });
  
  // NEUE LOGIK: Gruppiere Inventar nach tankNr und aggregiere Daten
  // Ein physischer Container kann MEHRERE Chargen des GLEICHEN Produkts enthalten!
  const containerData = new Map<string, {
    items: typeof inventoryItems,
    totalVolume: number,
    products: string[]
  }>();
  
  inventoryItems.forEach(item => {
    if (!item.tankNr || !item.tankNr.trim()) return;
    
    const tankNr = item.tankNr.trim();
    
    if (!containerData.has(tankNr)) {
      containerData.set(tankNr, {
        items: [],
        totalVolume: 0,
        products: []
      });
    }
    
    const data = containerData.get(tankNr)!;
    data.items.push(item);
    data.totalVolume += item.currentQuantityLiters || 0;
    if (item.produktName && !data.products.includes(item.produktName)) {
      data.products.push(item.produktName);
    }
  });
  
  // Erstelle Container basierend auf aggregierten Daten
  const inventoryContainers = new Map<string, TankDefinition[]>();
  
  containerData.forEach((data, tankNr) => {
    const isUnique = tankNr.match(/^T\s?\d+/i); // Tanks mit T-Nummer sind eindeutig
    
    if (isUnique) {
      // Eindeutige Tanks (T 341, T 349) - EIN physischer Container mit ALLEN Produkten/Chargen
      inventoryContainers.set(tankNr, [{
        id: tankNr,
        tankNr: tankNr,
        bezeichnung: tankNr, // z.B. "T 338"
        volumenLiter: Math.max(5000, data.totalVolume * 1.2), // 20% Reserve
        containerType: 'tank',
        hasUniqueNumber: true,
        status: data.totalVolume > 0 ? 'filled' : 'empty',
        currentContent: data.products.join(', ') // z.B. "Salbei M, Thymian M"
      }]);
    } else {
      // Nicht-eindeutige Behälter (B, Fass, Fl, IBC) - Pro CHARGE ein eigener Container
      // WICHTIG: Jede Inventar-Zeile = Ein physischer Behälter!
      // Beispiel: 5 Chargen "Zitronenmelisse" in "B" = 5 separate Ballons (B-1, B-2, B-3, B-4, B-5)
      inventoryContainers.set(tankNr, []);
      const containers = inventoryContainers.get(tankNr)!;
      
      // Erstelle für JEDE Charge einen separaten Container
      let containerNumber = 1;
      data.items.forEach(item => {
        const containerId = `${tankNr}-${containerNumber}`;
        
        containers.push({
          id: containerId,
          tankNr: tankNr,
          bezeichnung: containerId, // z.B. "B-1", "Fass-2", "IBC-3"
          volumenLiter: Math.max(100, (item.currentQuantityLiters || 0) * 1.2), // +20% Reserve
          containerType: 'other',
          hasUniqueNumber: true, // ✅ KRITISCHER FIX: "B-1" ist ein eindeutiger Container!
          currentContent: item.produktName || 'Unbekannt', // z.B. "Pfefferminze" (sortenrein!)
          status: (item.currentQuantityLiters || 0) > 0 ? 'filled' : 'empty'
        });
        
        containerNumber++;
      });
    }
  });

  // WICHTIG: XLSX-Import-Sicherheit - Manuell angelegte Tanks IMMER behalten!
  // Aber: Auto-generierte Container (B-1, B-2...) aus früheren Syncs ERSETZEN!
  let hasChanges = correctedTanks.length !== currentTanks.length;
  
  const manualContainers = correctedTanks.filter(tank => {
    // Prüfe ob dieser Container aus dem Inventar stammt
    const fromInventory = inventoryContainers.has(tank.tankNr);
    
    // NEUE LOGIK: Erkenne ob Container WIRKLICH manuell erstellt wurde
    // Kriterien für "echt manuell":
    // 1. Hat KEINE "Auto-erkannt" Bezeichnung UND
    // 2. Hat KEINE Standard-Muster wie "B-1", "Fass-2" (= aus früherem Sync) UND
    // 3. Bezeichnung ≠ tankNr (Custom-Name vom User)
    
    const isOldAutoDetected = tank.bezeichnung?.includes('Auto-erkannt') || 
                              (tank.bezeichnung?.includes('(') && tank.bezeichnung?.includes(')'));
    
    const isFromPreviousSync = !!tank.id.match(/^(B|Fass|Fl|IBC)-\d+$/) || // B-1, Fass-2
                               !!tank.id.match(/^T\s?\d+$/i) ||              // T 341, T347
                               !!tank.id.match(/^C\s?\d+$/i) ||              // C 07
                               tank.bezeichnung === tank.id ||
                               tank.bezeichnung === tank.tankNr;
    
    // Wenn Container aus früherem Sync UND neues Inventar vorhanden → ERSETZEN
    if ((isFromPreviousSync || isOldAutoDetected) && fromInventory) {
      console.log(`� Ersetze Container aus früherem Sync: ${tank.id}`);
      hasChanges = true;
      return false; // NICHT behalten, wird durch neue Inventar-Daten ersetzt
    }
    
    // ECHT manuell erstellte Container (User hat Custom-Name vergeben) → BEHALTEN
    if (!isOldAutoDetected && !isFromPreviousSync) {
      console.log(`� MANUELL ERSTELLT - Tank wird beibehalten: ${tank.id} ("${tank.bezeichnung}")`);
      return true; // IMMER behalten
    }
    
    // Alte Container ohne Inventar-Match → behalten (könnte geleert worden sein)
    return true;
  });

  // Füge alle neuen Container aus Inventar hinzu
  const updatedTanks = [...manualContainers];
  
  inventoryContainers.forEach((containers, tankNr) => {
    containers.forEach(container => {
      const existingIndex = updatedTanks.findIndex(t => t.id === container.id);
      
      if (existingIndex >= 0) {
        // XLSX-IMPORT-SICHERHEIT: Prüfe ob bestehender Container manuell erstellt wurde
        const existing = updatedTanks[existingIndex];
        const isManual = !existing.bezeichnung?.includes('Auto-erkannt') &&
                         !(existing.bezeichnung?.includes('(') && existing.bezeichnung?.includes(')'));
        
        if (isManual) {
          // Manuell erstellter Tank → NUR Füllstand aktualisieren, NICHT Bezeichnung/Volumen überschreiben
          console.log(`🔒 MANUELLER TANK - Nur Füllstand aktualisiert: ${existing.id}`);
          updatedTanks[existingIndex] = {
            ...existing,
            currentContent: container.currentContent, // Inhalt aktualisieren
            status: container.status // Status aktualisieren (filled/empty)
            // bezeichnung, volumenLiter BLEIBEN erhalten!
          };
          hasChanges = true;
        } else {
          // Auto-erkannter Tank → vollständig aktualisieren
          if (existing.bezeichnung !== container.bezeichnung ||
              existing.currentContent !== container.currentContent ||
              existing.status !== container.status ||
              existing.volumenLiter !== container.volumenLiter) {
            
            updatedTanks[existingIndex] = {
              ...existing,
              bezeichnung: container.bezeichnung,
              currentContent: container.currentContent,
              status: container.status,
              volumenLiter: container.volumenLiter
            };
            hasChanges = true;
            console.log(`✏️ Auto-Container aktualisiert: ${container.id} → "${container.bezeichnung}" (${container.status}, ${container.volumenLiter}L)`);
          }
        }
      } else {
        // Neuer Container aus XLSX
        updatedTanks.push(container);
        hasChanges = true;
        console.log(`➕ Neuer Container aus XLSX: ${container.id} → "${container.bezeichnung}" (${container.currentContent}, ${container.volumenLiter}L)`);
      }
    });
  });

  if (hasChanges) {
    // Speichere mit hybridStorage
    await hybridStorage.set('tankDefinitions', updatedTanks);
    console.log('✅ Tank-Sync: Tank-Definitionen korrigiert und gespeichert:', updatedTanks.length, 'Tanks');
    console.log('🔍 Tank-Sync Debug: Container-IDs:', updatedTanks.map(t => `${t.id} → "${t.bezeichnung}"`));
    
    // KRITISCH: Synchronisiere zu localStorage für tank-overview und qr-album
    try {
      const tankData = updatedTanks.map(tank => ({
        tankNr: tank.tankNr,
        tankId: tank.tankNr,
        bezeichnung: tank.bezeichnung,
        category: tank.containerType || 'tank', // Nutze containerType als category
        volumenLiter: tank.volumenLiter,
        capacity: tank.volumenLiter,
        currentFill: 0, // Default, wird später aktualisiert
        sorte: tank.currentContent || '',
        charge: ''
      }));
      
      localStorage.setItem('tank-data', JSON.stringify(tankData));
      console.log('✅ Tank-Sync: tank-data in localStorage synchronisiert');
    } catch (error) {
      console.error('❌ Tank-Sync: Fehler bei localStorage sync:', error);
    }
    
    // Event für andere Komponenten aussenden
    window.dispatchEvent(new CustomEvent('tankDefinitionsUpdated', {
      detail: { tanks: updatedTanks }
    }));
  } else {
    console.log('ℹ️ Tank-Sync: Keine Änderungen nötig');
  }
}

/**
 * Holt alle verfügbaren Tank-Definitionen
 */
export async function getTankDefinitions(): Promise<TankDefinition[]> {
  if (typeof window === 'undefined') return [];
  
  return (await hybridStorage.get('tankDefinitions')) || [];
}

/**
 * Findet eine Tank-Definition anhand der Tank-Nummer
 */
export async function getTankByNumber(tankNr: string): Promise<TankDefinition | null> {
  const tanks = await getTankDefinitions();
  return tanks.find(tank => tank.tankNr === tankNr) || null;
}

/**
 * NOTFALL-KORREKTUR: Bereinigt inkonsistente Tank-IDs in localStorage
 * Sollte einmalig ausgeführt werden um das UUID-Problem zu beheben
 */
export async function fixTankIds(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  console.log('🔄 RESET: Lösche alle Tank-Definitionen und erstelle neu...');
  await hybridStorage.set('tankDefinitions', []); // Leeres Array
  await syncTankDefinitionsWithInventory(); // Neu erstellen aus Inventar
}

