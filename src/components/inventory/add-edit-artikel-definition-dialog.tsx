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
import { artikelDefinitionFormSchema, type ArtikelDefinitionFormInput, type ArtikelDefinition } from '@/schemas/artikelDefinitionSchema';
import { BookMarked, Save } from 'lucide-react';
import { useEffect } from 'react';

type AddEditArtikelDefinitionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaveDefinition: (data: ArtikelDefinitionFormInput) => void;
  initialData?: ArtikelDefinition | null; // For editing
};

function getCategoryOptions(): string[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('inventoryCategories');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Falls Objekt-Array: nur Namen extrahieren
        if (Array.isArray(parsed) && typeof parsed[0] === 'object' && parsed[0] !== null) {
          return parsed.map((cat: any) => cat.name);
        }
        return parsed;
      } catch { return []; } // Keine Default-Kategorien
    }
  }
  return []; // Keine Default-Kategorien - User muss diese in Einstellungen anlegen
}

export default function AddEditArtikelDefinitionDialog({ isOpen, onClose, onSaveDefinition, initialData }: AddEditArtikelDefinitionDialogProps) {
  const form = useForm<ArtikelDefinitionFormInput>({
    resolver: zodResolver(artikelDefinitionFormSchema),
    defaultValues: { // Set default values to prevent uncontrolled to controlled error
        artikelNummer: '',
        produktName: '',
        category: undefined,
        beschreibung: '',
    }
  });

  const isEditing = !!initialData?.id;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          id: initialData.id,
          artikelNummer: initialData.artikelNummer,
          produktName: initialData.produktName,
          category: initialData.category,
          beschreibung: initialData.beschreibung,
        });
      } else {
        form.reset({
          id: undefined,
          artikelNummer: '',
          produktName: '',
          category: undefined, // Will show placeholder "Kategorie wählen"
          beschreibung: '',
        });
      }
    }
  }, [initialData, form, isOpen]);

  const onSubmit = (data: ArtikelDefinitionFormInput) => {
    onSaveDefinition(data);
    // Form reset is handled by useEffect when dialog reopens or initialData changes
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-primary" />
            {isEditing ? 'Artikel bearbeiten' : 'Neuen Artikel definieren'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Bearbeiten Sie die Details dieses Artikels.' : 'Definieren Sie einen neuen Artikel für Ihren Artikelstamm.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="produktName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produktname</FormLabel>
                  <FormControl>
                    <Input placeholder="Name des Produkts" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="artikelNummer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artikelnummer</FormLabel>
                  <FormControl>
                    <Input placeholder="Eindeutige Artikel-Nr." {...field} value={field.value ?? ""} />
                  </FormControl>
                  {/* Keine Pflicht und keine Fehlermeldung mehr */}
                </FormItem>
              )}
            />
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
                        <SelectItem key={String(cat)} value={cat}>
                          {String(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="beschreibung"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Zusätzliche Informationen zum Artikel..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              <FormField
                control={form.control}
                name="dichte20C"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dichte 20°C (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" min="0" placeholder="z.B. 0.9725" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Änderungen speichern' : 'Artikel definieren'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
