'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CheckCircle2,
  Calendar,
  Factory,
  Boxes,
  BarChart3,
  Plus,
  X,
  FileText,
  FileSpreadsheet,
  Download,
  Printer
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import hybridStorage from '@/lib/hybrid-storage';
import { 
  RangeCalculator as RangeCalc, 
  RangeCalculationResult,
  RangeRelevantRecipe,
  InventoryItem,
  ComponentDetail,
  ContainerRecommendation
} from '@/lib/range-calculator';
import { Rezeptur } from '@/schemas/rezepturSchema';

/**
 * Hauptkomponente für Reichweitenanalyse
 * 
 * Layout: 3 Spalten
 * - Links: Eingaben (Rezeptauswahl, Absatzplanung)
 * - Mitte: Hauptmetriken (Cards mit Reichweite, Vorrat, etc.)
 * - Rechts: Komponenten-Details und Visualisierung
 */
export default function RangeCalculator() {
  // State Management
  const [recipes, setRecipes] = useState<RangeRelevantRecipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]); // MEHRERE Rezepte
  const [calculationResult, setCalculationResult] = useState<RangeCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Benutzereingaben
  const [jahresbedarfLiter, setJahresbedarfLiter] = useState<number>(5000); // Default: 5000L/Jahr
  const [lagerbestandLohnabfueller, setLagerbestandLohnabfueller] = useState<number>(0); // Default: 0L
  const [zielProduktionLiter, setZielProduktionLiter] = useState<number>(0); // NEU: Ziel-Produktionsmenge (0 = deaktiviert)
  
  // GFKC Lagerstand (permanent berechnet)
  const [gfkcLagerstand, setGfkcLagerstand] = useState<number>(0);
  
  // Manuelle Mengen-Überschreibungen für Komponenten
  const [componentOverrides, setComponentOverrides] = useState<Map<string, number>>(new Map());

  // Laden der Daten beim Mount
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Lädt Rezepturen und Inventar aus hybridStorage
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Inventar laden - direkt vom Schlüssel 'inventoryItems'
      const inventoryItems = await hybridStorage.get<InventoryItem[]>('inventoryItems') || [];
      setInventory(inventoryItems);

      // GFKC-Lagerstand permanent berechnen
      const gfkcMazeratItems = inventoryItems.filter(item => {
        const name = item.produktName?.toLowerCase() || '';
        const category = (item.category || '').toLowerCase().trim();
        const isGFKC = name.includes('gfkc') || name.includes('grundfruchtlikör');
        const isMazerat = category === 'm' || 
                         category === 'mazerat' || 
                         category.includes('mazerat');
        return isGFKC && isMazerat;
      });
      
      const gfkcLager = gfkcMazeratItems.reduce((sum, item) => sum + (item.currentQuantityLiters || 0), 0);
      setGfkcLagerstand(gfkcLager);
      
      console.log('🔍 GFKC-Items im Inventory gefunden:', inventoryItems.filter(i => 
        i.produktName?.toLowerCase().includes('gfkc')
      ).map(item => ({
        name: item.produktName,
        category: item.category,
        menge: item.currentQuantityLiters,
      })));
      
      console.log('📦 GFKC-Mazerat Lagerstand:', gfkcLager, 'Liter');

      // Rezepturen laden - über app-auto-sync (wie im Editor)
      const { ladeRezepturen } = await import('@/lib/app-auto-sync');
      const allRecipes = await ladeRezepturen();

      console.log('📚 Alle Rezepturen geladen:', allRecipes.length);
      console.log('📋 Rezepturen-Details:', allRecipes.map(r => ({
        id: r.id,
        name: r.name,
        zielProdukt: r.zielProduktName,
        status: r.status,
        komponenten: r.komponenten?.length || 0
      })));

      // Nur GFKC-HERSTELLUNGS-Rezepte (Zielprodukt = GFKC)
      const relevantRecipes = allRecipes
        .filter(r => {
          // Prüfe ob Rezept GFKC HERSTELLT (nicht als Komponente nutzt!)
          const istGFKCRezept = r.zielProduktName?.toLowerCase().includes('gfkc') ||
                                 r.name?.toLowerCase().includes('gfkc');
          const istFreigegeben = r.status === 'freigegeben';
          
          console.log('🔍 Prüfe Rezept:', {
            name: r.name,
            zielProdukt: r.zielProduktName,
            status: r.status,
            istGFKCRezept,
            istFreigegeben,
            match: istGFKCRezept && istFreigegeben
          });
          
          return istGFKCRezept && istFreigegeben; // Nur freigegebene Rezepte
        })
        .map(r => ({
          ...r,
          isRangeRelevant: true,
          rangeMetadata: {
            productName: r.zielProduktName || r.name || 'Unbenannt',
            plannedAnnualSales: jahresbedarfLiter,
            priority: 1,
          }
        })) as RangeRelevantRecipe[];

      setRecipes(relevantRecipes);
      
      console.log('✅ GFKC-Rezepte gefunden:', relevantRecipes.length);

      // Erstes Rezept automatisch auswählen (in Array)
      if (relevantRecipes.length > 0 && selectedRecipeIds.length === 0) {
        setSelectedRecipeIds([relevantRecipes[0].id || '']);
      }

      console.log('✅ Reichweitenanalyse Daten geladen:', {
        inventoryItems: inventoryItems.length,
        recipes: relevantRecipes.length,
      });

    } catch (err) {
      console.error('❌ Fehler beim Laden der Reichweitenanalyse-Daten:', err);
      setError('Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Berechnet Reichweite - mit oder ohne Rezeptur
   */
  const calculateRange = () => {
    try {
      const calculator = new RangeCalc(inventory, recipes);
      
      // Berechne verfügbares GFKC im Lager (Priorität 1)
      const gfkcItems = inventory.filter(item => {
        const name = item.produktName?.toLowerCase() || '';
        const category = (item.category || '').toLowerCase().trim();
        
        // GFKC-Erkennung
        const isGFKC = name.includes('gfkc') || name.includes('grundfruchtlikör');
        
        // Mazerat-Kategorie (verschiedene Schreibweisen)
        const isMazerat = category === 'm' || 
                         category === 'mazerat' || 
                         category.includes('mazerat') ||
                         category.startsWith('m ') ||
                         category === 'kategorie m';
        
        console.log('🔍 Prüfe Item:', {
          name: item.produktName,
          category: item.category,
          categoryLower: category,
          isGFKC,
          isMazerat,
          match: isGFKC && isMazerat,
          menge: item.currentQuantityLiters
        });
        
        return isGFKC && isMazerat;
      });
      
      const gfkcImLager = gfkcItems.reduce((sum, item) => sum + (item.currentQuantityLiters || 0), 0);
      
      console.log('📦 GFKC im Lager:', {
        gefundeneItems: gfkcItems.length,
        gesamtLiter: gfkcImLager,
        items: gfkcItems.map(i => ({ name: i.produktName, menge: i.currentQuantityLiters }))
      });

      const gfkcGesamt = gfkcImLager + lagerbestandLohnabfueller;
      
      console.log('💰 GFKC Gesamt berechnet:', {
        lager: gfkcImLager,
        lohnabfueller: lagerbestandLohnabfueller,
        gesamt: gfkcGesamt
      });

      // WENN Rezeptur vorhanden: Berechne Produktionspotential (Priorität 2)
      let productionPotential = 0;
      let componentDetails: ComponentDetail[] = [];
      let bottleneckComponent = '';
      let productionPlan = undefined;

      if (selectedRecipeIds.length > 0 && recipes.length > 0) {
        const primaryRecipeId = selectedRecipeIds[0];
        
        // Übergebe manuelle Überschreibungen an die Berechnung
        const recipeResult = calculator.calculateRange(primaryRecipeId, zielProduktionLiter || undefined, componentOverrides);
        
        if (recipeResult) {
          productionPotential = recipeResult.productionPotential || 0;
          componentDetails = recipeResult.componentDetails || [];
          bottleneckComponent = recipeResult.bottleneckIngredient || '';
          productionPlan = recipeResult.productionPlan; // WICHTIG: ProductionPlan übernehmen!
        }
      }

      // Gesamtpotential
      const totalPotential = gfkcGesamt + productionPotential;

      // Reichweite berechnen
      const rangeInDays = jahresbedarfLiter > 0 
        ? (totalPotential / (jahresbedarfLiter / 365))
        : Infinity;
      const rangeInYears = jahresbedarfLiter > 0
        ? (totalPotential / jahresbedarfLiter)
        : Infinity;

      const result: RangeCalculationResult = {
        recipeName: recipes.find(r => r.id === selectedRecipeIds[0])?.name || 'Nur Lagerbestand',
        totalAvailableGFKC: gfkcGesamt,
        productionPotential: productionPotential,
        totalPotential: totalPotential,
        rangeInDays: rangeInDays,
        rangeInYears: rangeInYears,
        plannedAnnualSales: jahresbedarfLiter,
        dailyConsumption: jahresbedarfLiter / 365,
        componentDetails: componentDetails,
        bottleneckIngredient: bottleneckComponent,
        bottleneckQuantity: componentDetails.find(c => c.isBottleneck)?.availableQuantity || 0,
        criticalIngredients: componentDetails.filter(c => c.criticality === 'critical').map(c => c.componentName),
        calculatedAt: new Date().toISOString(),
        productionPlan: productionPlan, // WICHTIG: ProductionPlan ins Result aufnehmen!
      };

      setCalculationResult(result);
      setError(null);

      console.log('✅ Reichweite berechnet:', result);

    } catch (err) {
      console.error('❌ Berechnungsfehler:', err);
      setError('Fehler bei der Berechnung. Bitte überprüfen Sie die Eingaben.');
    }
  };
  
  /**
   * Toggle Rezept-Auswahl (Checkbox)
   */
  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipeIds(prev => {
      if (prev.includes(recipeId)) {
        return prev.filter(id => id !== recipeId);
      } else {
        return [...prev, recipeId];
      }
    });
  };

  /**
   * Aktualisiert Jahresbedarf
   */
  const updateJahresbedarf = (value: string) => {
    const bedarf = parseFloat(value);
    if (isNaN(bedarf) || bedarf < 0) return;
    setJahresbedarfLiter(bedarf);
    
    // Rezepte aktualisieren
    setRecipes(prev => prev.map(r => ({
      ...r,
      rangeMetadata: r.rangeMetadata ? {
        ...r.rangeMetadata,
        plannedAnnualSales: bedarf,
      } : undefined
    })));
  };

  /**
   * Export als PDF (Drucken)
   */
  /**
   * Export als PDF (direkter Download, nicht über Druckdialog)
   */
  const exportPDF = async () => {
    if (!calculationResult) return;
    
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;
      
      // Helper function for German number formatting
      const formatGerman = (num: number, decimals: number = 2): string => {
        return num.toLocaleString('de-DE', { 
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals 
        });
      };
      
      // Helper function for adding text with line height
      const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' = 'normal', indent = 0) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.text(text, margin + indent, yPos);
        yPos += fontSize * 0.5 + 2;
      };
      
      // Helper function for adding a line
      const addLine = () => {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
      };
      
      // Titel
      addText('Reichweitenanalyse GFKC', 18, 'bold');
      addText(`Erstellt am: ${new Date().toLocaleString('de-DE')}`, 10, 'normal');
      yPos += 5;
      addLine();
      
      // GFKC Lagerbestand
      addText('GFKC Lagerbestand', 14, 'bold');
      yPos += 2;
      addText(`Eigenes Lager: ${formatGerman(gfkcLagerstand)} L`, 11, 'normal', 5);
      addText(`Beim Lohnabfueller: ${formatGerman(lagerbestandLohnabfueller)} L`, 11, 'normal', 5);
      addText(`Herstellbar: ${formatGerman(calculationResult.productionPotential)} L`, 11, 'normal', 5);
      addText(`Gesamt verfuegbar: ${formatGerman(calculationResult.totalPotential)} L`, 11, 'bold', 5);
      yPos += 5;
      addLine();
      
      // Reichweite
      addText('Reichweite', 14, 'bold');
      yPos += 2;
      addText(`Jahresbedarf: ${formatGerman(jahresbedarfLiter)} L`, 11, 'normal', 5);
      addText(`Tagesverbrauch: ${formatGerman(calculationResult.dailyConsumption)} L`, 11, 'normal', 5);
      addText(`Reichweite: ${formatGerman(calculationResult.rangeInDays, 1)} Tage (${formatGerman(calculationResult.rangeInYears)} Jahre)`, 11, 'bold', 5);
      yPos += 5;
      
      // Engpass-Warnung
      if (calculationResult.bottleneckIngredient) {
        doc.setTextColor(220, 38, 38); // Red
        addText(`⚠ Engpass: ${calculationResult.bottleneckIngredient}`, 11, 'bold', 5);
        doc.setTextColor(0, 0, 0); // Reset to black
        yPos += 3;
      }
      
      addLine();
      
      // Komponenten-Details
      addText('Komponenten-Details', 14, 'bold');
      yPos += 5;
      
      // Table Header
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const colX = [margin + 5, margin + 55, margin + 85, margin + 110, margin + 140, margin + 165];
      doc.text('Komponente', colX[0], yPos);
      doc.text('Kategorie', colX[1], yPos);
      doc.text('Lager (L)', colX[2], yPos);
      doc.text('Ben./Batch', colX[3], yPos);
      doc.text('Batches', colX[4], yPos);
      doc.text('Status', colX[5], yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      
      // Table Rows
      calculationResult.componentDetails.forEach((comp, index) => {
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
          // Repeat header
          doc.setFont('helvetica', 'bold');
          doc.text('Komponente', colX[0], yPos);
          doc.text('Kategorie', colX[1], yPos);
          doc.text('Lager (L)', colX[2], yPos);
          doc.text('Ben./Batch', colX[3], yPos);
          doc.text('Batches', colX[4], yPos);
          doc.text('Status', colX[5], yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
        }
        
        // Row background (alternating)
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos - 3.5, contentWidth, 5, 'F');
        }
        
        // Component name (truncate if too long)
        const compName = comp.componentName.length > 22 ? comp.componentName.substring(0, 20) + '...' : comp.componentName;
        doc.text(compName, colX[0], yPos);
        doc.text(comp.category || '-', colX[1], yPos);
        doc.text(comp.availableQuantity === Infinity ? '∞' : formatGerman(comp.availableQuantity, 1), colX[2], yPos);
        doc.text(formatGerman(comp.requiredPerBatch ?? 0), colX[3], yPos);
        doc.text(comp.possibleBatches === Infinity ? '∞' : (comp.possibleBatches ?? 0).toLocaleString('de-DE'), colX[4], yPos);
        
        // Status with color
        let status = 'OK';
        if (comp.isBottleneck) {
          status = 'ENGPASS';
          doc.setTextColor(220, 38, 38);
        } else if (comp.criticality === 'critical') {
          status = 'KRITISCH';
          doc.setTextColor(220, 38, 38);
        } else if (comp.criticality === 'low') {
          status = 'NIEDRIG';
          doc.setTextColor(234, 179, 8);
        } else {
          doc.setTextColor(34, 197, 94);
        }
        doc.text(status, colX[5], yPos);
        doc.setTextColor(0, 0, 0);
        
        yPos += 5;
      });
      
      // Footer
      yPos = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('MazerationsMeister - Reichweitenanalyse', margin, yPos);
      doc.text(`Seite 1`, pageWidth - margin - 10, yPos);
      
      // Save PDF
      doc.save(`Reichweitenanalyse_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('❌ PDF-Export Fehler:', error);
      alert('Fehler beim PDF-Export. Bitte versuchen Sie es erneut.');
    }
  };
  
  /**
   * Export als Druck (Druckdialog öffnen)
   */
  const exportPrint = () => {
    if (!calculationResult) return;
    window.print();
  };

  /**
   * Export als CSV
   */
  const exportCSV = () => {
    if (!calculationResult) return;
    
    let csv = 'Reichweitenanalyse GFKC\n';
    csv += `Erstellt am;${new Date().toLocaleString('de-DE')}\n\n`;
    csv += 'GFKC Lagerbestand\n';
    csv += `Eigenes Lager;${gfkcLagerstand.toLocaleString('de-DE', {minimumFractionDigits: 2})};L\n`;
    csv += `Beim Lohnabfueller;${lagerbestandLohnabfueller.toLocaleString('de-DE', {minimumFractionDigits: 2})};L\n`;
    csv += `Herstellbar;${calculationResult.productionPotential.toLocaleString('de-DE', {minimumFractionDigits: 2})};L\n`;
    csv += `Gesamt verfuegbar;${calculationResult.totalPotential.toLocaleString('de-DE', {minimumFractionDigits: 2})};L\n\n`;
    csv += 'Reichweite\n';
    csv += `Jahresbedarf;${jahresbedarfLiter.toLocaleString('de-DE', {minimumFractionDigits: 2})};L\n`;
    csv += `Tagesverbrauch;${calculationResult.dailyConsumption.toLocaleString('de-DE', {minimumFractionDigits: 2})};L\n`;
    csv += `Reichweite (Tage);${calculationResult.rangeInDays.toLocaleString('de-DE', {minimumFractionDigits: 1})}\n`;
    csv += `Reichweite (Jahre);${calculationResult.rangeInYears.toLocaleString('de-DE', {minimumFractionDigits: 2})}\n\n`;
    csv += 'Komponenten-Details\n';
    csv += 'Komponente;Kategorie;Lager (L);Benötigt/Batch;Mögliche Batches;Status\n';
    
    calculationResult.componentDetails.forEach(comp => {
      csv += `${comp.componentName};${comp.category || ''};`;
      csv += `${comp.availableQuantity === Infinity ? '∞' : comp.availableQuantity.toLocaleString('de-DE', {minimumFractionDigits: 1})};`;
      csv += `${(comp.requiredPerBatch ?? 0).toLocaleString('de-DE', {minimumFractionDigits: 2})};`;
      csv += `${comp.possibleBatches === Infinity ? '∞' : (comp.possibleBatches ?? 0).toLocaleString('de-DE')};`;
      csv += `${comp.isBottleneck ? 'ENGPASS' : comp.criticality === 'critical' ? 'KRITISCH' : comp.criticality === 'low' ? 'NIEDRIG' : 'OK'}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reichweitenanalyse_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  /**
   * Export als Excel
   */
  const exportExcel = async () => {
    if (!calculationResult) return;
    
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    const mainData = [
      ['Reichweitenanalyse GFKC'],
      ['Erstellt am', new Date().toLocaleString('de-DE')],
      [''],
      ['GFKC Lagerbestand'],
      ['Eigenes Lager', gfkcLagerstand, 'L'],
      ['Beim Lohnabfüller', lagerbestandLohnabfueller, 'L'],
      ['Herstellbar', calculationResult.productionPotential, 'L'],
      ['Gesamt verfügbar', calculationResult.totalPotential, 'L'],
      [''],
      ['Reichweite'],
      ['Jahresbedarf', jahresbedarfLiter, 'L'],
      ['Tagesverbrauch', calculationResult.dailyConsumption.toFixed(2), 'L'],
      ['Reichweite (Tage)', calculationResult.rangeInDays.toFixed(1)],
      ['Reichweite (Jahre)', calculationResult.rangeInYears.toFixed(2)],
      [''],
      ['Komponenten-Details'],
      ['Komponente', 'Kategorie', 'Lager (L)', 'Benötigt/Batch', 'Mögliche Batches', 'Status'],
    ];
    
    calculationResult.componentDetails.forEach(comp => {
      mainData.push([
        comp.componentName,
        comp.category || '',
        comp.availableQuantity,
        comp.requiredPerBatch ?? 0,
        comp.possibleBatches === Infinity ? '∞' : (comp.possibleBatches ?? 0),
        comp.isBottleneck ? 'ENGPASS' : comp.criticality === 'critical' ? 'KRITISCH' : comp.criticality === 'low' ? 'NIEDRIG' : 'OK'
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(mainData);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Reichweitenanalyse');
    
    XLSX.writeFile(wb, `Reichweitenanalyse_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  
  /**
   * Aktualisiert Lagerbestand beim Lohnabfüller
   */
  const updateLohnabfuellerBestand = (value: string) => {
    const bestand = parseFloat(value);
    if (isNaN(bestand) || bestand < 0) return;
    setLagerbestandLohnabfueller(bestand);
  };

  // Formatierungs-Hilfsfunktionen
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('de-DE', { 
      minimumFractionDigits: 1,
      maximumFractionDigits: 1 
    }).format(num);
  };

  const formatDays = (days: number): string => {
    if (days === Infinity) return '∞';
    return Math.round(days).toString();
  };

  const formatYears = (years: number): string => {
    if (years === Infinity) return '∞';
    return formatNumber(years);
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8">
          <p className="text-muted-foreground">Reichweitendaten werden geladen...</p>
        </Card>
      </div>
    );
  }

  // Wenn keine Rezepte: Trotzdem UI zeigen mit Anleitung
  const showNoRecipesWarning = recipes.length === 0;

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Warnung wenn keine Rezepte */}
      {showNoRecipesWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Keine GFKC-Herstellungsrezepte gefunden.</strong>
            <br />
            <br />
            <strong>So richten Sie die Reichweitenanalyse ein:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-2 text-sm">
              <li>Gehen Sie zu <strong>Rezepturen</strong> im Menü</li>
              <li>Erstellen Sie eine neue Rezeptur oder bearbeiten Sie eine bestehende</li>
              <li>Geben Sie beim Feld <strong>"Zielprodukt"</strong> den Text <strong>"GFKC"</strong> ein</li>
              <li>Fügen Sie alle Einzelkomponenten hinzu (Mazerate, Destillate, etc.)</li>
              <li>Im Abschnitt "Status & Workflow" aktivieren Sie die Checkbox <strong>"Freigegeben"</strong></li>
              <li>Speichern Sie die Rezeptur</li>
              <li>Kehren Sie zur Reichweitenanalyse zurück</li>
            </ol>
            <br />
            <p className="text-sm">
              Die Reichweitenanalyse berechnet dann, wie lange Ihre Vorräte reichen und wie viel GFKC 
              Sie noch aus den vorhandenen Einzelkomponenten herstellen können.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Export-Buttons - nur wenn Berechnung vorhanden */}
      {calculationResult && (
        <div className="flex gap-2 justify-end print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={exportPrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Drucken
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPDF}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      )}

      {/* 3-Spalten-Layout - IMMER anzeigen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LINKE SPALTE: Eingaben (3 Spalten breit) */}
        <div className="lg:col-span-3 space-y-4">
          {/* GFKC Lagerstand - PERMANENT SICHTBAR */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                GFKC im eigenen Lager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {gfkcLagerstand.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Fertiges GFKC-Mazerat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Eingaben
              </CardTitle>
              <CardDescription>Rezeptauswahl und Absatzplanung</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rezeptauswahl - nur wenn Rezepte vorhanden */}
              {recipes.length > 0 && (
                <div className="space-y-2">
                  <Label>Basisrezeptur(en) auswählen</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Wählen Sie die Rezeptur(en) für die Produktionspotential-Berechnung
                  </p>
                  <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                    {recipes.map(recipe => (
                      <div key={recipe.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`recipe-${recipe.id}`}
                          checked={selectedRecipeIds.includes(recipe.id || '')}
                          onCheckedChange={() => toggleRecipeSelection(recipe.id || '')}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`recipe-${recipe.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {recipe.rangeMetadata?.productName || recipe.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {recipe.komponenten?.length || 0} Komponenten
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wenn keine Rezepte: Hinweis */}
              {recipes.length === 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm">
                    Kein GFKC-Rezept vorhanden.
                    <br />
                    Bitte zuerst im <strong>Rezepturen</strong>-Bereich erstellen.
                  </AlertDescription>
                </Alert>
              )}

              {/* Ziel-Produktionsmenge (NEUE FUNKTION) */}
              <div className="space-y-2">
                <Label htmlFor="target-production">Ziel-Produktionsmenge (optional)</Label>
                <Input
                  id="target-production"
                  type="number"
                  min="0"
                  step="100"
                  value={zielProduktionLiter || ''}
                  onChange={(e) => setZielProduktionLiter(e.target.value ? Number(e.target.value) : 0)}
                  placeholder="z.B. 5000"
                />
                <p className="text-xs text-muted-foreground">
                  <span className="block">0 oder leer = Reichweite</span>
                  <span className="block">&gt;0 = Produktionsplanung (FIFO)</span>
                </p>
              </div>

              {/* Jahresbedarf GFKC */}
              <div className="space-y-2">
                <Label htmlFor="jahresbedarf">Jahresbedarf GFKC (Liter)</Label>
                <Input
                  id="jahresbedarf"
                  type="number"
                  min="0"
                  step="100"
                  value={jahresbedarfLiter}
                  onChange={(e) => updateJahresbedarf(e.target.value)}
                  placeholder="z.B. 5000"
                />
                <p className="text-xs text-muted-foreground">
                  Abnahme Lohnabfüller pro Jahr
                </p>
              </div>

              {/* Lagerbestand beim Lohnabfüller */}
              <div className="space-y-2">
                <Label htmlFor="lohnabfueller">GFKC beim Lohnabfüller (Liter)</Label>
                <Input
                  id="lohnabfueller"
                  type="number"
                  min="0"
                  step="100"
                  value={lagerbestandLohnabfueller}
                  onChange={(e) => updateLohnabfuellerBestand(e.target.value)}
                  placeholder="z.B. 1000"
                />
                <p className="text-xs text-muted-foreground">
                  Aktueller Bestand extern
                </p>
              </div>

              {/* Berechnen Button */}
              <Button 
                onClick={calculateRange} 
                className="w-full"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Reichweite berechnen
              </Button>
              
              {recipes.length === 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Berechnung läuft ohne Rezeptur (nur Lagerbestand)
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Info-Card - nur wenn keine Rezeptur */}
          {recipes.length === 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm">💡 Info: Produktionspotential</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p>Aktuell wird nur der <strong>fertige Lagerbestand</strong> berücksichtigt (Priorität 1).</p>
                <p className="mt-2">Optional: Erstellen Sie eine GFKC-Herstellungsrezeptur für die Berechnung des Produktionspotentials (Priorität 2):</p>
                <ul className="list-disc list-inside ml-2 space-y-1 mt-2">
                  <li>Rezepturen → Neue Rezeptur</li>
                  <li>Zielprodukt: "GFKC"</li>
                  <li>Status: "Freigegeben" aktivieren</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* MITTLERE SPALTE: Hauptmetriken (6 Spalten breit) */}
        <div className="lg:col-span-6 space-y-4">
          {calculationResult ? (
            <>
              {/* Reichweite Card */}
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Reichweite
                  </CardTitle>
                  <CardDescription>Wie lange reichen die Vorräte?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-bold text-primary">
                        {formatDays(calculationResult.rangeInDays)}
                      </p>
                      <p className="text-sm text-muted-foreground">Tage</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-primary">
                        {formatYears(calculationResult.rangeInYears)}
                      </p>
                      <p className="text-sm text-muted-foreground">Jahre</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vorrat & Produktion Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* GFKC im eigenen Lager */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      GFKC Lager
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatNumber(calculationResult.totalAvailableGFKC - lagerbestandLohnabfueller)} L</p>
                    <p className="text-xs text-muted-foreground mt-1">Eigenes Lager</p>
                  </CardContent>
                </Card>

                {/* GFKC beim Lohnabfüller */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Beim Abfüller
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatNumber(lagerbestandLohnabfueller)} L</p>
                    <p className="text-xs text-muted-foreground mt-1">Extern</p>
                  </CardContent>
                </Card>

                {/* Produktionspotential */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Factory className="h-4 w-4" />
                      Herstellbar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatNumber(calculationResult.productionPotential)} L</p>
                    <p className="text-xs text-muted-foreground mt-1">Aus Komponenten</p>
                  </CardContent>
                </Card>

                {/* Gesamtvorrat */}
                <Card className="border-2 border-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Boxes className="h-4 w-4" />
                      Gesamt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary">{formatNumber(calculationResult.totalPotential)} L</p>
                    <p className="text-xs text-muted-foreground mt-1">Verfügbar + Herstellbar</p>
                  </CardContent>
                </Card>
              </div>

              {/* Engpass Alert */}
              {calculationResult.bottleneckIngredient && (
                <Alert variant={calculationResult.bottleneckQuantity === 0 ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Engpass:</strong> {calculationResult.bottleneckIngredient}
                    <br />
                    <span className="text-sm">
                      Verfügbar: {formatNumber(calculationResult.bottleneckQuantity)} L
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Kritische Komponenten */}
              {calculationResult.criticalIngredients.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <AlertDescription>
                    <strong>Kritische Komponenten (&lt;10% Reichweite):</strong>
                    <ul className="list-disc list-inside mt-2 text-sm">
                      {calculationResult.criticalIngredients.map(ing => (
                        <li key={ing}>{ing}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center min-h-[300px] p-8">
                <div className="text-center text-muted-foreground max-w-md">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  {recipes.length > 0 ? (
                    <>
                      <p className="text-lg font-medium mb-2">Bereit zur Berechnung</p>
                      <p className="text-sm">
                        Passen Sie links die Eingaben an und klicken Sie auf 
                        <strong> "Reichweite berechnen"</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium mb-2">Keine Berechnungsgrundlage</p>
                      <p className="text-sm mb-4">
                        Erstellen Sie zuerst eine GFKC-Rezeptur im <strong>Rezepturen</strong>-Bereich.
                      </p>
                      <div className="bg-white p-4 rounded-lg border text-left space-y-2">
                        <p className="text-xs font-medium">📋 Checkliste:</p>
                        <ul className="text-xs space-y-1">
                          <li>✓ Menü → Rezepturen</li>
                          <li>✓ Neue Rezeptur erstellen</li>
                          <li>✓ Zielprodukt: "GFKC"</li>
                          <li>✓ Komponenten hinzufügen</li>
                          <li>✓ Status: "Freigegeben"</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RECHTE SPALTE: Komponenten-Details (3 Spalten breit) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Komponenten
              </CardTitle>
              <CardDescription>Status der Zutaten</CardDescription>
            </CardHeader>
            <CardContent>
              {calculationResult && calculationResult.componentDetails.length > 0 ? (
                <div className="space-y-3">
                  {calculationResult.componentDetails.map((comp, idx) => (
                    <ComponentCard 
                      key={idx} 
                      component={comp}
                      onOverrideChange={(name, qty) => {
                        const newOverrides = new Map(componentOverrides);
                        if (qty === null) {
                          newOverrides.delete(name);
                        } else {
                          newOverrides.set(name, qty);
                        }
                        setComponentOverrides(newOverrides);
                        
                        // Berechnung automatisch neu ausführen
                        setTimeout(() => {
                          calculateRange();
                        }, 100);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Boxes className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground">
                    {recipes.length === 0 
                      ? 'Komponenten-Analyse nach Rezeptur-Erstellung verfügbar'
                      : 'Komponenten-Details nach Berechnung sichtbar'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* PRODUKTIONSPLANUNG (nur wenn Ziel-Produktionsmenge eingegeben) */}
      {calculationResult?.productionPlan && zielProduktionLiter > 0 && (
        <Card className="mt-6 border-2 border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Factory className="h-5 w-5" />
              Produktionsplanung: {zielProduktionLiter.toLocaleString('de-DE')} Liter
            </CardTitle>
            <CardDescription>
              FIFO-Entnahmeempfehlung für Zielproduktion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status-Übersicht */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Ziel-Menge</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {calculationResult.productionPlan.targetQuantity.toLocaleString('de-DE')} L
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Tatsächlich möglich</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {calculationResult.productionPlan.actualQuantity.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} L
                  </div>
                </CardContent>
              </Card>
              <Card className={calculationResult.productionPlan.isPossible ? 'bg-green-50' : 'bg-red-50'}>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className={`text-2xl font-bold ${calculationResult.productionPlan.isPossible ? 'text-green-700' : 'text-red-700'}`}>
                    {calculationResult.productionPlan.isPossible ? '✓ Möglich' : '✗ Nicht möglich'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Limitierung Alert */}
            {!calculationResult.productionPlan.isPossible && calculationResult.productionPlan.limitingComponent && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Limitiert durch: {calculationResult.productionPlan.limitingComponent}</strong>
                  <br />
                  <span className="text-sm">
                    Fehlende Menge: {(calculationResult.productionPlan.missingQuantity || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})} L
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Skalierungsfaktor */}
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-muted-foreground">Skalierungsfaktor (Rezept → Zielproduktion)</p>
              <p className="text-xl font-bold text-purple-700">
                × {calculationResult.productionPlan.scalingFactor.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>

            {/* Komponenten-Anforderungen */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Boxes className="h-4 w-4" />
                Komponenten-Anforderungen
              </h4>
              {calculationResult.productionPlan.componentRequirements.map((comp, idx) => (
                <Card key={idx} className={`${
                  comp.criticality === 'critical' ? 'border-red-300 bg-red-50/50' :
                  comp.criticality === 'low' ? 'border-orange-300 bg-orange-50/50' :
                  'border-green-300 bg-green-50/50'
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-medium flex items-center gap-2">
                          {comp.componentName}
                          {comp.isBottleneck && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              🔴 Engpass
                            </span>
                          )}
                        </h5>
                        {comp.category && (
                          <p className="text-xs text-muted-foreground">{comp.category}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {comp.criticality === 'ok' && <span className="text-green-600 text-xl">✓</span>}
                        {comp.criticality === 'low' && <span className="text-orange-600 text-xl">⚠</span>}
                        {comp.criticality === 'critical' && <span className="text-red-600 text-xl">✗</span>}
                      </div>
                    </div>

                    {/* Mengen-Übersicht */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Benötigt:</p>
                        <p className="font-semibold">
                          {(comp.requiredForProduction || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})} L
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Verfügbar:</p>
                        <p className="font-semibold">
                          {comp.availableQuantity.toLocaleString('de-DE', {minimumFractionDigits: 2})} L
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Max. Produktionsmenge mit dieser Komponente:</p>
                        <p className="font-semibold text-blue-700">
                          {(comp.maxProductionLiters || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})} L
                        </p>
                      </div>
                    </div>

                    {/* FIFO-Gebindeliste */}
                    {comp.containers && comp.containers.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          FIFO-Entnahmeempfehlung:
                        </p>
                        <div className="space-y-2">
                          {comp.containers.map((container, cIdx) => (
                            <div 
                              key={cIdx}
                              className={`flex items-center justify-between p-2 rounded text-sm ${
                                container.isFull ? 'bg-blue-100 border border-blue-300' : 'bg-white border'
                              }`}
                            >
                              <div className="flex-1">
                                <p className="font-medium">
                                  {cIdx + 1}. {container.containerId}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({container.containerType})
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Aktuell: {container.currentQuantity.toLocaleString('de-DE', {minimumFractionDigits: 2})} L
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-purple-700">
                                  ➜ {container.quantityToTake.toLocaleString('de-DE', {minimumFractionDigits: 2})} L
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Rest: {container.remainingAfter.toLocaleString('de-DE', {minimumFractionDigits: 2})} L
                                </p>
                                {container.isFull && (
                                  <p className="text-xs font-medium text-blue-700 mt-1">
                                    ✓ Komplett leeren
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verbrauchsprognose Chart (volle Breite unterhalb) */}
      {calculationResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Verbrauchsprognose
            </CardTitle>
            <CardDescription>
              Vorrat-Entwicklung über die nächsten {Math.min(12, Math.ceil(calculationResult.rangeInYears))} Monate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConsumptionChart result={calculationResult} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Komponenten-Detail Card (kleine Komponente für rechte Spalte)
 */
interface ComponentCardProps {
  component: ComponentDetail;
  onOverrideChange?: (componentName: string, quantity: number | null) => void;
}

function ComponentCard({ component, onOverrideChange }: ComponentCardProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState<string>('');
  
  const getStatusIcon = () => {
    if (component.possibleBatches === Infinity) {
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
    if (component.criticality === 'critical') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (component.criticality === 'low') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  const getStatusColor = () => {
    if (component.criticality === 'critical') return 'border-red-500';
    if (component.criticality === 'low') return 'border-orange-500';
    return 'border-green-500';
  };

  const getProgressColor = () => {
    if (component.criticality === 'critical') return 'bg-red-500';
    if (component.criticality === 'low') return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Unbegrenzte Ressourcen (z.B. Wasser)
  const isUnlimited = component.possibleBatches === Infinity;
  
  // Fortschrittsbalken: Prozent der benötigten Menge für 10 Batches
  const targetBatches = 10;
  const targetQuantity = (component.requiredPerBatch ?? 0) * targetBatches;
  const percentage = !isUnlimited && targetQuantity > 0 
    ? Math.min((component.availableQuantity / targetQuantity) * 100, 100)
    : 100;

  const handleOverrideSubmit = () => {
    if (onOverrideChange) {
      const value = parseFloat(overrideValue);
      if (!isNaN(value) && value >= 0) {
        onOverrideChange(component.componentName, value);
        setShowOverride(false);
      }
    }
  };

  const handleClearOverride = () => {
    if (onOverrideChange) {
      onOverrideChange(component.componentName, null);
      setOverrideValue('');
      setShowOverride(false);
    }
  };

  return (
    <div className={`p-3 border-l-4 ${getStatusColor()} bg-gray-50 dark:bg-gray-900 rounded`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="font-medium text-sm">{component.componentName}</p>
              {component.category && (
                <p className="text-xs text-muted-foreground">
                  {component.category}
                </p>
              )}
            </div>
          </div>
          
          {isUnlimited ? (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              ∞ Unbegrenzt verfügbar
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Lager: <strong>{component.availableQuantity.toFixed(1)} L</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Mögliche Batches: <strong>{component.possibleBatches}</strong>
              </p>
            </>
          )}
          
          {/* Fortschrittsbalken */}
          {!isUnlimited && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`${getProgressColor()} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                  title={`${percentage.toFixed(0)}% von Ziel (${targetBatches} Batches)`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {percentage.toFixed(0)}% von Ziel
              </p>
            </div>
          )}

          {component.isBottleneck && !isUnlimited && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              🔴 Engpass
            </p>
          )}
          
          {/* Manuelle Überschreibung für kritische Komponenten oder Engpässe */}
          {(component.criticality === 'critical' || component.isBottleneck) && !isUnlimited && onOverrideChange && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              {!showOverride ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7"
                  onClick={() => setShowOverride(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Theoretischen Bestand eingeben
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Menge in Liter"
                    value={overrideValue}
                    onChange={(e) => setOverrideValue(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 h-6 text-xs"
                      onClick={handleOverrideSubmit}
                    >
                      OK
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2"
                      onClick={handleClearOverride}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Verbrauchsprognose Chart Komponente
 */
function ConsumptionChart({ result }: { result: RangeCalculationResult }) {
  // Berechne Verbrauch über Zeit (12 Monate)
  const monthlyData = [];
  const monthsToShow = Math.min(12, Math.ceil(result.rangeInYears * 12));
  const monthlyConsumption = result.dailyConsumption * 30; // ~30 Tage pro Monat

  let remainingStock = result.totalPotential;

  for (let month = 0; month <= monthsToShow; month++) {
    monthlyData.push({
      month: month === 0 ? 'Jetzt' : `Monat ${month}`,
      stock: Math.max(remainingStock, 0),
      consumed: month === 0 ? 0 : monthlyConsumption,
    });

    remainingStock -= monthlyConsumption;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            label={{ value: 'Liter', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(1)} L`, '']}
            labelStyle={{ color: '#000' }}
          />
          <Bar dataKey="stock" name="Verfügbarer Vorrat">
            {monthlyData.map((entry, index) => {
              // Farbverlauf: Grün → Gelb → Rot
              const ratio = entry.stock / result.totalPotential;
              let color = '#22c55e'; // Grün
              if (ratio < 0.5) color = '#eab308'; // Gelb
              if (ratio < 0.2) color = '#ef4444'; // Rot
              
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
