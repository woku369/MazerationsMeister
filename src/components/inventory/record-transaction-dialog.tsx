
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { transactionFormSchema, type TransactionFormInput, type StoredInventoryItem, type InventoryTransactionCoreData } from '@/schemas/inventorySchema';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarDays, Save, ArrowRightLeft } from 'lucide-react';
import { useEffect } from 'react';

type RecordTransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransaction: (data: InventoryTransactionCoreData) => void;
  itemToTransact: StoredInventoryItem | null;
  transactionType: 'Zugang' | 'Abgang' | null;
};

export default function RecordTransactionDialog({ 
    isOpen, 
    onClose, 
    onSaveTransaction, 
    itemToTransact, 
    transactionType 
}: RecordTransactionDialogProps) {
  const form = useForm<TransactionFormInput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      quantityLiters: undefined, // Let Zod handle coercion from undefined to number
      transactionDate: new Date(),
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        quantityLiters: undefined,
        transactionDate: new Date(),
        notes: '',
      });
    }
  }, [isOpen, form]);

  const onSubmit = (data: TransactionFormInput) => {
    if (!itemToTransact || !transactionType) return;
    
    const coreData: InventoryTransactionCoreData = {
      quantityLiters: data.quantityLiters,
      transactionDate: data.transactionDate,
      notes: data.notes,
    };
    onSaveTransaction(coreData);
  };

  const handleNumericInputChange = (field: any, rawValue: string) => {
    if (/^[0-9]*[,.]?[0-9]*$/.test(rawValue) || rawValue === "") {
      // field.onChange(rawValue === "" ? undefined : rawValue); // Pass undefined if empty, else the string
       field.onChange(rawValue); // Schema will coerce
    }
  };

  const getNumericFieldValueForDisplay = (value: any): string => {
    if (value === null || value === undefined || value === '' || isNaN(parseFloat(String(value).replace(',', '.')))) return '';
    return String(value).replace('.', ',');
  };

  if (!itemToTransact || !transactionType) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
            {transactionType === 'Zugang' ? 'Zugang buchen für:' : 'Abgang buchen für:'}
          </DialogTitle>
          <DialogDescription>
             {itemToTransact.produktName} {itemToTransact.chargenNummer ? `(Charge: ${itemToTransact.chargenNummer})` : `(Art.-Nr.: ${itemToTransact.artikelNummer})`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="quantityLiters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Menge ({transactionType}) in Liter</FormLabel>
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

            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Datum der Transaktion</FormLabel>
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bemerkungen (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="z.B. Grund für Buchung, Korrektur..." {...field} value={field.value ?? ''}/>
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
                {transactionType} buchen
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

