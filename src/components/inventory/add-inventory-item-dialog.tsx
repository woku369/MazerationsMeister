
"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { inventoryItemFormSchema, type InventoryItemFormInput, type StoredInventoryItem } from '@/schemas/inventorySchema';
import { findAehnlichenWert } from '@/lib/stock-service';
import type { ArtikelDefinition } from '@/schemas/artikelDefinitionSchema';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarDays, PackagePlus, Save, BookHeart } from 'lucide-react';
import { useEffect, useState } from 'react';

type AddInventoryItemDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaveItem: (data: InventoryItemFormInput) => void;
  initialData?: StoredInventoryItem | null; // For editing
  artikelDefinitionen: ArtikelDefinition[]; // For selecting an article
  bekannteChargen?: string[]; // Bereits im Lager vorkommende Chargennummern, für Tippfehler-Warnung
  bekannteTanks?: string[]; // Bereits bekannte Tank-/Lagerort-Bezeichnungen, für Tippfehler-Warnung
};

function getCategoryOptions(): string[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('inventoryCategories');
    if (stored) {
      const categories = JSON.parse(stored);
      return categories.map((cat: any) => cat.name);
    }
  }
  return []; // Keine Default-Kategorien - User muss diese in Einstellungen anlegen
}

export default function AddInventoryItemDialog({
    isOpen,
    onClose,
    onSaveItem,
    initialData,
    artikelDefinitionen,
    bekannteChargen = [],
    bekannteTanks = [],
}: AddInventoryItemDialogProps) {
  const form = useForm<InventoryItemFormInput>({
    resolver: zodResolver(inventoryItemFormSchema),
  });

  const [selectedDefinitionIdState, setSelectedDefinitionIdState] = useState<string | undefined>(undefined);

  const watchedCategory = form.watch('category');
  const isEditing = !!initialData?.id;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          id: initialData.id,
          artikelNummer: initialData.artikelNummer,
          produktName: initialData.produktName,
          chargenNummer: initialData.chargenNummer,
          category: initialData.category,
          tankNr: initialData.tankNr,
          quantityLiters: initialData.currentQuantityLiters,
          alcoholVolProzent: initialData.alcoholVolProzent,
          // initialData kommt oft aus JSON.parse(localStorage) - lastInventoryDate ist dann ein
          // String, kein echtes Date-Objekt, und die Zod-Validierung (z.date()) lehnt das beim
          // Speichern sonst mit "Ungültiges Datum" ab, ohne dass sichtbar wird warum.
          inventoryDate: initialData.lastInventoryDate ? new Date(initialData.lastInventoryDate) : new Date(),
          bemerkungen: initialData.bemerkungen,
          korrekturGrund: '',
        });
        const matchingDef = artikelDefinitionen.find(def => def.artikelNummer === initialData.artikelNummer);
        setSelectedDefinitionIdState(matchingDef?.id);
      } else {
        form.reset({
          id: undefined,
          artikelNummer: '',
          produktName: '',
          chargenNummer: '',
          category: undefined,
          tankNr: '',
          quantityLiters: 0,
          alcoholVolProzent: 0,
          inventoryDate: new Date(),
          bemerkungen: '',
        });
        setSelectedDefinitionIdState(undefined);
      }
    }
  }, [initialData, form, isOpen, artikelDefinitionen]);


  useEffect(() => {
    if (isOpen && !isEditing && watchedCategory === 'Einsatzalkohol') {
      if (form.getValues('alcoholVolProzent') === 0) { 
        form.setValue('alcoholVolProzent', 60, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedCategory, isEditing, form, isOpen]);

  const handleDefinitionSelect = (definitionId: string | undefined) => {
  setSelectedDefinitionIdState(definitionId);
  if (definitionId) {
    const selectedDef = artikelDefinitionen.find(def => def.id === definitionId);
    if (selectedDef) {
      form.setValue('artikelNummer', selectedDef.artikelNummer, { shouldValidate: true, shouldDirty: true });
      form.setValue('produktName', selectedDef.produktName, { shouldValidate: true, shouldDirty: true });
      form.setValue('category', selectedDef.category, { shouldValidate: true, shouldDirty: true });
      form.setValue('kennzeichen', selectedDef.kennzeichen || 'S', { shouldValidate: true, shouldDirty: true });
    }
  }
  };

  const onSubmit = (data: InventoryItemFormInput) => {
    // Bei einer Mengen- oder ABV-Änderung eines bestehenden Postens (z.B. Inventur-
    // Korrektur nach Steigrohr-Ablesung) muss ein Grund angegeben werden, damit die
    // Korrektur im Buchungsjournal nachvollziehbar/begründbar bleibt - nicht nur die
    // reinen Vorher/Nachher-Zahlen.
    if (isEditing && initialData) {
      const mengeGeaendert = data.quantityLiters !== initialData.currentQuantityLiters;
      const abvGeaendert = data.alcoholVolProzent !== initialData.alcoholVolProzent;
      if ((mengeGeaendert || abvGeaendert) && !data.korrekturGrund?.trim()) {
        form.setError('korrekturGrund', { type: 'manual', message: 'Bei einer Mengen- oder ABV-Änderung bitte einen Grund angeben (z.B. Steigrohr-Ablesung Inventur).' });
        return;
      }
    }
    onSaveItem(data);
  };
  
  const handleNumericInputChange = (field: any, rawValue: string) => {
    if (/^[0-9]*[,.]?[0-9]*$/.test(rawValue) || rawValue === "") {
      field.onChange(rawValue);
    }
  };

  const getNumericFieldValueForDisplay = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    return String(value).replace('.', ',');
  };

  return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-[625px]">
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Artikel-Auswahl aus Stammdaten */}
            <div className="mb-2">
              <label className="font-medium flex items-center gap-1"><BookHeart className="w-4 h-4 text-muted-foreground" />Artikel aus Stammdaten (optional)</label>
              <Select onValueChange={handleDefinitionSelect} value={selectedDefinitionIdState}>
                <SelectTrigger>
                  <SelectValue placeholder="Artikel wählen, um Felder vorab auszufüllen..." />
                </SelectTrigger>
                <SelectContent>
                  {artikelDefinitionen.length === 0 && <SelectItem value="no-def" disabled>Keine Artikel im Stamm definiert.</SelectItem>}
                  {artikelDefinitionen.map((def) => (
                    <SelectItem key={def.id} value={def.id}>
                      {def.produktName} ({def.artikelNummer}) - {def.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Kennzeichen-Auswahl */}
            <FormField
              control={form.control}
              name="kennzeichen"
              render={({ field }) => (
                <FormItem className="mb-2">
                  <FormLabel>Kennzeichen</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">Standardprodukt (S)</SelectItem>
                      <SelectItem value="V">Versuchsprodukt (V)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {/* Artikelnummer */}
            <FormField
              control={form.control}
              name="artikelNummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artikelnummer</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. M001, EA001" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Produktname */}
            <FormField
              control={form.control}
              name="produktName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produktname</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Thymianmazerat, Ethanol 60%" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Chargennummer */}
            <FormField
              control={form.control}
              name="chargenNummer"
              render={({ field }) => {
                const aehnlicheCharge = findAehnlichenWert(field.value ?? '', bekannteChargen);
                return (
                  <FormItem>
                    <FormLabel>Chargennummer (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Charge A, 2024-001" list="bekannte-chargen" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <datalist id="bekannte-chargen">
                      {bekannteChargen.map(c => <option key={c} value={c} />)}
                    </datalist>
                    {aehnlicheCharge && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Ähnlich zu bereits vorhandener Charge „{aehnlicheCharge}" — meintest du diese?
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            {/* Kategorie */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategorie</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {getCategoryOptions().map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Tank-Nr. / Lagerort */}
            <FormField
              control={form.control}
              name="tankNr"
              render={({ field }) => {
                const aehnlicherTank = findAehnlichenWert(field.value ?? '', bekannteTanks);
                return (
                  <FormItem>
                    <FormLabel>Tank-Nr. / Lagerort</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. T01, Regal 5B" list="bekannte-tanks" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <datalist id="bekannte-tanks">
                      {bekannteTanks.map(t => <option key={t} value={t} />)}
                    </datalist>
                    {aehnlicherTank && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Ähnlich zu bereits vorhandenem Tank „{aehnlicherTank}" — meintest du diesen?
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            {/* Menge (Liter) */}
            <FormField
              control={form.control}
              name="quantityLiters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Menge (Liter)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="0,00" 
                      {...field} 
                      value={getNumericFieldValueForDisplay(field.value)}
                      onChange={e => handleNumericInputChange(field, e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Alkoholgehalt (%vol.) */}
            <FormField
              control={form.control}
              name="alcoholVolProzent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alkoholgehalt (%vol.)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="0,0" 
                      {...field} 
                      value={getNumericFieldValueForDisplay(field.value)}
                      onChange={e => handleNumericInputChange(field, e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Korrektur-Grund - nur beim Bearbeiten, Pflicht wenn Menge/ABV geändert wurden */}
            {isEditing && (
              <FormField
                control={form.control}
                name="korrekturGrund"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grund bei Mengen-/ABV-Korrektur (falls zutreffend)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="z.B. Steigrohr-Ablesung Inventur 31.12., 13°C"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {/* Inventur-/Erfassungsdatum */}
            <FormField
              control={form.control}
              name="inventoryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Inventur-/Erfassungsdatum</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, 'dd.MM.yyyy') : <span>Datum wählen</span>}
                          <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('2000-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Bemerkungen (optional) */}
            <FormField
              control={form.control}
              name="bemerkungen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bemerkungen (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="z.B. Verlust bei Produktion, Qualitätsnotiz..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Footer mit Buttons */}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Änderungen speichern' : 'Artikel hinzufügen'}
              </Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>
)
}
