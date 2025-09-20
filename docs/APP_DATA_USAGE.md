/**
 * 📋 ANLEITUNG: APP-DATEN-MANAGER USAGE
 * 
 * Das neue persistente Daten-System ersetzt alle Mock-Daten und
 * manuellen localStorage-Aufrufe. Hier ist wie du es nutzt:
 */

// === 1. IN KOMPONENTEN ===

// ALT (Mock-Daten, manuell localStorage):
/*
const [tanks, setTanks] = useState([
  { id: '1', tankNr: 'T001', bezeichnung: 'Mock Tank' }
]);

useEffect(() => {
  const stored = localStorage.getItem('tankDefinitions');
  if (stored) {
    setTanks(JSON.parse(stored));
  }
}, []);

const saveTank = (tank) => {
  const updated = [...tanks, tank];
  setTanks(updated);
  localStorage.setItem('tankDefinitions', JSON.stringify(updated));
};
*/

// NEU (Persistent, automatisch):
import { useTanks } from '@/hooks/use-app-data';

function TankComponent() {
  const { tanks, addTank, updateTank, deleteTank, isLoading } = useTanks();
  
  if (isLoading) return <div>Lade Echtdaten...</div>;
  
  const handleAddTank = () => {
    addTank({
      id: crypto.randomUUID(),
      tankNr: 'T341',
      bezeichnung: 'Neuer Tank',
      volumen: 5000
    });
    // Automatisch in localStorage gespeichert!
  };
  
  return (
    <div>
      {tanks.map(tank => (
        <div key={tank.id}>{tank.bezeichnung}</div>
      ))}
    </div>
  );
}

// === 2. VERFÜGBARE HOOKS ===

// 🚀 Tanks
import { useTanks } from '@/hooks/use-app-data';
const { tanks, addTank, updateTank, deleteTank, updateTanks } = useTanks();

// 📦 Inventar
import { useInventory } from '@/hooks/use-app-data';
const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();

// 📋 Protokolle
import { useProtocols } from '@/hooks/use-app-data';
const { protocols, addProtocol, updateProtocol, deleteProtocol } = useProtocols();

// ✅ Dashboard Tasks
import { useDashboardTasks } from '@/hooks/use-app-data';
const { tasks, addTask, updateTask, deleteTask } = useDashboardTasks();

// ⚙️ Einstellungen
import { useAppSettings } from '@/hooks/use-app-data';
const { settings, updateSetting } = useAppSettings();

// === 3. DIREKTE API (ohne Hooks) ===

import { 
  saveTanks, 
  saveInventory, 
  getTanks, 
  getInventory,
  createAppBackup,
  restoreAppData,
  getAppDataStatus 
} from '@/lib/app-data-manager';

// Schneller Zugriff
const currentTanks = getTanks();
saveTanks([...currentTanks, newTank]);

// Backup erstellen
await createAppBackup();

// Status prüfen
const status = getAppDataStatus();
console.log(`${status.tankCount} Tanks, ${status.storageUsage} verwendet`);

// === 4. APP-START INTEGRATION ===

// Das Layout (app/layout.tsx) lädt automatisch alle Daten:
/*
<AppDataInitializer>
  <div>Your App Content</div>
</AppDataInitializer>
*/

// Zeigt Loading-Screen mit Daten-Status
// Lädt alle persistenten Echtdaten
// Erstellt automatische Backups

// === 5. MIGRATION VON BESTEHENDEN KOMPONENTEN ===

// Schritt 1: Import ersetzen
// ALT: useState, useEffect, localStorage
// NEU: import { useTanks } from '@/hooks/use-app-data';

// Schritt 2: State ersetzen
// ALT: const [tanks, setTanks] = useState([]);
// NEU: const { tanks, addTank, updateTank } = useTanks();

// Schritt 3: Loading entfernen
// ALT: useEffect mit localStorage.getItem
// NEU: isLoading von Hook nutzen

// Schritt 4: Save-Funktionen ersetzen
// ALT: localStorage.setItem + setState
// NEU: addTank() / updateTank() (automatisch persistent)

// === 6. DEBUGGING ===

// Development Mode zeigt automatisch Debug-Info:
// - Anzahl Tanks, Inventory, Protokolle
// - Storage Usage
// - Letztes Backup
// - Live-Updates bei Änderungen

// Status in Console:
import { getAppDataStatus } from '@/lib/app-data-manager';
console.log('App Data Status:', getAppDataStatus());

// === 7. VORTEILE ===

/*
✅ Keine Mock-Daten mehr - nur Echtdaten
✅ Kein manueller localStorage-Code
✅ Automatische Synchronisation zwischen Komponenten
✅ Automatische Backups
✅ Type-Safe mit TypeScript
✅ Debugging-Tools integriert
✅ Performance-optimiert mit useCallback
✅ Error-Handling eingebaut
✅ Loading-States automatisch
✅ Event-System für externe Integration
*/

export {};