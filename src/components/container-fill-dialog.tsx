"use client";

/**
 * 🏭 BEHÄLTER-BEFÜLL-DIALOG
 * UI zum Befüllen von Containern aus Quell-Tanks mit automatischen Lagerbewegungen
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TankDefinition } from '@/schemas/tankSchema';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import { fillContainerFromTank } from '@/lib/container-management';
import { hybridStorage } from '@/lib/hybrid-storage';

type ContainerFillDialogProps = {
  container: TankDefinition;
  onSuccess: (updatedContainer: TankDefinition) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ContainerFillDialog({ container, onSuccess, trigger, open: externalOpen, onOpenChange }: ContainerFillDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [sourceTankNr, setSourceTankNr] = useState('');
  const [targetTankNr, setTargetTankNr] = useState('');
  const [amount, setAmount] = useState('');
  const [availableTanks, setAvailableTanks] = useState<StoredInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'source' | 'target'>('source'); // Modus: Von Quelle oder zu Ziel

  // Lade verfügbare Tanks basierend auf Modus
  useEffect(() => {
    if (open) {
      loadAvailableTanks();
    }
  }, [open]);

  async function loadAvailableTanks() {
    const items = await hybridStorage.get('inventoryItems') || [];
    console.log('🔍 DEBUG: Geladene Inventar-Items:', items.length, items);
    
    // Prüfe ob der aktuelle Container Inhalt hat
    const containerItems = items.filter((item: StoredInventoryItem) => 
      item.tankNr === container.id || item.tankNr === container.tankNr
    );
    console.log('🔍 DEBUG: Container-Items für', container.id, ':', containerItems);
    const hasContent = containerItems.reduce((sum: number, item: StoredInventoryItem) => sum + (item.currentQuantityLiters || 0), 0) > 0;
    console.log('🔍 DEBUG: hasContent =', hasContent);
    
    if (hasContent) {
      // MODUS: Quelle → Ziel (Container hat Inhalt, suche LEERE Ziele)
      setMode('source');
      setSourceTankNr(container.id); // Dieser Container ist die Quelle
      
      // Hole alle Tank-Definitionen
      const allTanks = await hybridStorage.get('tank-data') || [];
      console.log('🔍 DEBUG: Alle Tanks:', allTanks.length);
      
      // Finde LEERE Tanks (keine Inventar-Items zugeordnet)
      const emptyTanks = allTanks
        .filter((tank: TankDefinition) => {
          const tankItems = items.filter((item: StoredInventoryItem) => 
            item.tankNr === tank.id || item.tankNr === tank.tankNr
          );
          return tankItems.length === 0 && tank.id !== container.id;
        })
        .map((tank: TankDefinition) => ({
          id: `empty-${tank.id}`,
          tankNr: tank.id,
          produktName: `${tank.id} (leer)`,
          batchNumber: '-',
          currentQuantityLiters: 0,
          alcoholContent: 0,
          category: tank.containerType || 'Container',
          description: `Leerer Container (${tank.volumenLiter}L Kapazität)`,
          acquisitionDate: new Date().toISOString(),
        } as StoredInventoryItem));
      
      console.log('🔍 DEBUG: Leere Tanks gefunden:', emptyTanks.length);
      setAvailableTanks(emptyTanks);
    } else {
      // MODUS: Ziel ← Quelle (Container ist leer, suche GEFÜLLTE Quellen)
      setMode('target');
      setTargetTankNr(container.id); // Dieser Container ist das Ziel
      
      // Filter: Nur Tanks mit Inhalt und genug Menge
      const tanks = items.filter((item: StoredInventoryItem) => {
        const hasQuantity = item.tankNr && item.currentQuantityLiters > 0;
        const notSameContainer = item.tankNr !== container.id && item.tankNr !== container.tankNr;
        console.log('🔍 DEBUG: Prüfe Item:', item.tankNr, '| Menge:', item.currentQuantityLiters, '| hasQuantity:', hasQuantity, '| notSame:', notSameContainer);
        return hasQuantity && notSameContainer;
      });
      console.log('🔍 DEBUG: Gefüllte Tanks gefunden:', tanks.length, tanks);
      setAvailableTanks(tanks);
    }
  }

  async function handleFill() {
    setError('');
    setLoading(true);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Bitte gültige Menge eingeben');
      }

      // Hole aktuelles Inventar
      const allItems = await hybridStorage.get('inventoryItems') || [];
      
      let result: {
        updatedContainer: TankDefinition;
        inventoryUpdates: {
          source: StoredInventoryItem;
          target: StoredInventoryItem;
        };
      };
      let sourceId: string;
      let targetContainer: TankDefinition;
      
      if (mode === 'source') {
        // Von QUELLE zu ZIEL: Container hat Inhalt → in leeren Container umfüllen
        if (!targetTankNr) {
          throw new Error('Bitte Ziel-Container auswählen');
        }
        
        sourceId = sourceTankNr; // Der aktuelle Container
        
        // Hole Ziel-Container Definition
        const allTanks = await hybridStorage.get('tank-data') || [];
        targetContainer = allTanks.find((t: TankDefinition) => t.id === targetTankNr);
        
        if (!targetContainer) {
          throw new Error('Ziel-Container nicht gefunden');
        }
        
        if (amountNum > targetContainer.volumenLiter) {
          throw new Error(`Maximales Volumen des Ziels: ${targetContainer.volumenLiter}L`);
        }
        
        // Führe Transfer durch: Von diesem Container zum Ziel
        result = await fillContainerFromTank(
          targetContainer,
          sourceId,
          amountNum,
          availableTanks.find(t => t.tankNr === sourceId)?.produktName || 'Unbekannt',
          allItems
        );
        
        // Aktualisiere Inventar in hybridStorage
        const updatedInventory = allItems.map((item: StoredInventoryItem) => 
          item.id === result.inventoryUpdates.source.id ? result.inventoryUpdates.source : item
        );
        updatedInventory.push(result.inventoryUpdates.target);
        await hybridStorage.set('inventoryItems', updatedInventory);
        
        console.log('✅ Umfüllen erfolgreich:', sourceId, '→', targetContainer.id);
        
        // Erfolg - gebe QUELL-Container zurück (für UI-Update)
        onSuccess(container);
        
      } else {
        // Von QUELLE zu ZIEL: Leerer Container ← gefüllter Tank
        if (!sourceTankNr) {
          throw new Error('Bitte Quell-Tank auswählen');
        }
        
        targetContainer = container; // Der aktuelle Container ist das Ziel
        
        if (amountNum > targetContainer.volumenLiter) {
          throw new Error(`Maximales Volumen: ${targetContainer.volumenLiter}L`);
        }
        
        // Führe Transfer durch: Von Quelle in diesen Container
        result = await fillContainerFromTank(
          targetContainer,
          sourceTankNr,
          amountNum,
          availableTanks.find(t => t.tankNr === sourceTankNr)?.produktName || 'Unbekannt',
          allItems
        );
        
        // Aktualisiere Inventar in hybridStorage
        const updatedInventory = allItems.map((item: StoredInventoryItem) => 
          item.id === result.inventoryUpdates.source.id ? result.inventoryUpdates.source : item
        );
        updatedInventory.push(result.inventoryUpdates.target);
        await hybridStorage.set('inventoryItems', updatedInventory);
        
        console.log('✅ Befüllen erfolgreich:', sourceTankNr, '→', container.id);
        
        // Erfolg - gebe aktualisierten Container zurück
        onSuccess(result.updatedContainer);
      }
      
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Befüllen');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSourceTankNr('');
    setTargetTankNr('');
    setAmount('');
    setError('');
  }

  const selectedSourceTank = mode === 'target' ? availableTanks.find(t => t.tankNr === sourceTankNr) : null;
  const maxAmount = selectedSourceTank ? Math.min(selectedSourceTank.currentQuantityLiters, container.volumenLiter) : container.volumenLiter;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">📥 Befüllen</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'source' ? '📤 Umfüllen' : '📥 Container befüllen'}: {container.id}
          </DialogTitle>
          <DialogDescription>
            {mode === 'source' 
              ? `Füllen Sie den Inhalt von ${container.id} in einen leeren Container um.`
              : `Füllen Sie ${container.id} aus einem befüllten Tank.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Tank Auswahl (Quelle oder Ziel je nach Modus) */}
          <div className="grid gap-2">
            <Label htmlFor="tank-select">
              {mode === 'source' ? 'Ziel-Container (leer)' : 'Quell-Tank (gefüllt)'}
            </Label>
            <Select 
              value={mode === 'source' ? targetTankNr : sourceTankNr} 
              onValueChange={mode === 'source' ? setTargetTankNr : setSourceTankNr}
            >
              <SelectTrigger id="tank-select">
                <SelectValue placeholder={mode === 'source' ? 'Leeren Container auswählen...' : 'Tank auswählen...'} />
              </SelectTrigger>
              <SelectContent>
                {availableTanks.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    {mode === 'source' 
                      ? 'Keine leeren Container verfügbar' 
                      : 'Keine Tanks mit Inhalt verfügbar'
                    }
                  </div>
                ) : (
                  availableTanks.map(tank => (
                    <SelectItem key={tank.tankNr} value={tank.tankNr}>
                      {mode === 'source'
                        ? `${tank.produktName}` // Leere Container: "Fass-4 (leer, 200L)"
                        : `${tank.tankNr} - ${tank.produktName} (${tank.currentQuantityLiters}L)` // Gefüllte Tanks
                      }
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Menge */}
          {(mode === 'target' && selectedSourceTank) || mode === 'source' ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="amount">Menge (Liter)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  max={maxAmount}
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max. ${maxAmount}L`}
                />
                <p className="text-xs text-muted-foreground">
                  {mode === 'target' && selectedSourceTank && (
                    <>Verfügbar: {selectedSourceTank.currentQuantityLiters}L | </>
                  )}
                  Container-Kapazität: {container.volumenLiter}L
                </p>
              </div>

              {/* Vorschau */}
              {mode === 'target' && selectedSourceTank && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-semibold mb-1">Vorschau:</p>
                  <p>• Aus {sourceTankNr}: {selectedSourceTank.produktName}</p>
                  <p>• Nach {container.id}: {amount || '?'}L</p>
                  {selectedSourceTank.alcoholVolProzent && (
                    <p>• Alkohol: {selectedSourceTank.alcoholVolProzent}% Vol.</p>
                  )}
                </div>
              )}
              
              {mode === 'source' && targetTankNr && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-semibold mb-1">Vorschau:</p>
                  <p>• Aus {container.id}: {amount || '?'}L</p>
                  <p>• Nach {targetTankNr}</p>
                  <p className="text-orange-600 font-medium mt-2">→ Ziel wird als "Verschickt" markiert</p>
                </div>
              )}
            </>
          ) : null}

          {/* Fehler */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              ⚠️ {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleFill}
            disabled={loading || !amount || (mode === 'target' ? !sourceTankNr : !targetTankNr)}
          >
            {loading ? 'Wird umgefüllt...' : mode === 'source' ? '📤 Umfüllen & Verschicken' : '📥 Container befüllen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
