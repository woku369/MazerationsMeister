"use client";

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';

type SelectItemForTransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  items: StoredInventoryItem[];
  transactionType: 'Zugang' | 'Abgang' | null;
  onSelectItem: (item: StoredInventoryItem) => void;
};

// Vorstufe zu RecordTransactionDialog (Nutzer-Anfrage 30.10.2026): Die
// Zugang-/Abgang-Icons in der Bestandstabelle erfordern vorher das Suchen der
// richtigen Zeile - für den Hauptfall "schnell einen Abgang auf vorhandenen
// Sprit buchen" war das umständlich. Diese Posten-Auswahl öffnet sich über
// die neuen Toolbar-Buttons, bevor der eigentliche Buchungsdialog erscheint.
export default function SelectItemForTransactionDialog({
  isOpen,
  onClose,
  items,
  transactionType,
  onSelectItem,
}: SelectItemForTransactionDialogProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    // Ein Abgang auf einen bereits leeren Posten ergibt keinen Sinn - erst gar
    // nicht zur Auswahl anbieten, statt den Fehler erst im nächsten Dialog
    // (Mengen-Obergrenze 0) zu zeigen.
    const base = transactionType === 'Abgang'
      ? items.filter(i => i.currentQuantityLiters > 0)
      : items;
    const q = query.trim().toLowerCase();
    const matched = !q
      ? base
      : base.filter(i =>
          i.produktName.toLowerCase().includes(q) ||
          (i.chargenNummer || '').toLowerCase().includes(q) ||
          (i.tankNr || '').toLowerCase().includes(q) ||
          (i.category || '').toLowerCase().includes(q)
        );
    return [...matched].sort((a, b) => a.produktName.localeCompare(b.produktName, 'de'));
  }, [items, query, transactionType]);

  if (!transactionType) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {transactionType === 'Zugang' ? 'Zugang buchen – Posten wählen' : 'Abgang buchen – Posten wählen'}
          </DialogTitle>
          <DialogDescription>
            Produkt, Charge, Tank-Nr. oder Kategorie eingeben, um die Liste zu filtern (z.B. „Ethanol" oder „Sprit").
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Suchen..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="max-h-[50vh] overflow-y-auto divide-y border rounded-md">
          {filteredItems.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">Kein passender Posten gefunden.</div>
          )}
          {filteredItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item)}
              className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-center justify-between gap-3"
            >
              <span>
                <span className="font-medium">{item.produktName}</span>{' '}
                <span className="text-xs text-muted-foreground">
                  [{item.category || '–'}]
                  {item.chargenNummer ? ` · Charge ${item.chargenNummer}` : ''}
                  {item.tankNr ? ` · ${item.tankNr}` : ''}
                </span>
              </span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {item.currentQuantityLiters.toLocaleString('de-DE')} L @ {item.alcoholVolProzent}%
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
