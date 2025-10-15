"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PackageOpen } from 'lucide-react';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { TankDefinition } from '@/schemas/tankSchema';
import { getTankDefinitions } from '@/lib/tank-sync';

type AssignContainerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  item: StoredInventoryItem | null;
  onAssign: (tankId: string) => void;
};

export default function AssignContainerDialog({ isOpen, onClose, item, onAssign }: AssignContainerDialogProps) {
  const [containers, setContainers] = useState<TankDefinition[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>('');

  useEffect(() => {
    const loadContainers = async () => {
      const tanks = await getTankDefinitions();
      setContainers(tanks);
    };
    if (isOpen) {
      loadContainers();
    }
  }, [isOpen]);

  const handleAssign = () => {
    if (!selectedContainer) return;
    onAssign(selectedContainer);
    setSelectedContainer('');
    onClose();
  };

  if (!item) return null;

  // Gruppiere Container nach Kategorie
  const containersByCategory: Record<string, TankDefinition[]> = {};
  containers.forEach(tank => {
    const category = tank.tankNr; // "B", "Fass", "Fl", "T 341" etc.
    if (!containersByCategory[category]) {
      containersByCategory[category] = [];
    }
    containersByCategory[category].push(tank);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-purple-600" />
            Produkt in Container füllen
          </DialogTitle>
          <DialogDescription>
            Ordnen Sie das Produkt einem Container zu. Der Container wird automatisch aktualisiert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Produkt-Info */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Produkt</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{item.produktName}</p>
              {item.chargenNummer && (
                <p className="text-sm text-muted-foreground">Charge: {item.chargenNummer}</p>
              )}
              <div className="flex gap-4 mt-2 text-sm">
                <span><strong>Menge:</strong> {item.currentQuantityLiters.toFixed(2)} L</span>
                <span><strong>Alkohol:</strong> {item.alcoholVolProzent.toFixed(1)} % vol</span>
              </div>
            </div>
          </div>

          {/* Container-Auswahl */}
          <div className="space-y-2">
            <Label htmlFor="container-select">Ziel-Container</Label>
            <Select value={selectedContainer} onValueChange={setSelectedContainer}>
              <SelectTrigger id="container-select">
                <SelectValue placeholder="Container auswählen..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.keys(containersByCategory).sort().map(category => {
                  const tanksInCategory = containersByCategory[category];
                  
                  // Wenn nur ein Tank in der Kategorie, zeige ihn direkt
                  if (tanksInCategory.length === 1) {
                    const tank = tanksInCategory[0];
                    return (
                      <SelectItem key={tank.id} value={tank.id}>
                        <div className="flex items-center justify-between w-full min-w-[250px]">
                          <span className="font-medium">{tank.id}</span>
                          <span className="text-sm text-muted-foreground ml-4">
                            {tank.volumenLiter}L
                          </span>
                        </div>
                      </SelectItem>
                    );
                  }

                  // Sonst gruppiere nach Kategorie
                  return tanksInCategory.map(tank => (
                    <SelectItem key={tank.id} value={tank.id}>
                      <div className="flex items-center justify-between w-full min-w-[250px]">
                        <span className="font-medium">{tank.id}</span>
                        <span className="text-sm text-muted-foreground ml-4">
                          {tank.volumenLiter}L
                        </span>
                      </div>
                    </SelectItem>
                  ));
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Wählen Sie einen Container aus. Das Produkt wird dem Container zugeordnet.
            </p>
          </div>

          {/* Aktueller Container (falls vorhanden) */}
          {item.tankNr && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm">
                <strong>Aktueller Container:</strong> {item.tankNr}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Durch die Zuordnung wird der aktuelle Container ersetzt.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedContainer}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <PackageOpen className="mr-2 h-4 w-4" />
            In Container füllen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
