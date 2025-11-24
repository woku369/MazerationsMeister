/**
 * Reichweiten-Kalkulator für MazerationsMeister
 * 
 * Berechnet verfügbare GFKC-Mengen, Produktionspotential und Reichweite
 * basierend auf Lagerbestand, Rezepturen und geplanten Absatzmengen.
 */

import { Rezeptur } from '@/schemas/rezepturSchema';

// ============================================================================
// KONFIGURATION - Schwellenwerte für Kritikalität
// ============================================================================

/**
 * Schwellenwerte für Komponenten-Status (in möglichen Batches)
 * 
 * CRITICAL_THRESHOLD: Komponente ist kritisch wenn possibleBatches <= Wert
 * LOW_THRESHOLD: Komponente ist niedrig wenn possibleBatches < Wert
 * 
 * Kann manuell angepasst werden um Warnschwellen zu verändern.
 */
export const CRITICAL_THRESHOLD = 0;    // 0 Batches = kritisch (ausverkauft)
export const LOW_THRESHOLD = 5;         // < 5 Batches = niedrig (Warnung)
export const BOTTLENECK_THRESHOLD = 10; // < 10 Batches = potenzieller Engpass

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Erweiterte Rezeptur mit Reichweiten-Relevanz
 */
export interface RangeRelevantRecipe extends Rezeptur {
  isRangeRelevant?: boolean;
  rangeMetadata?: {
    productName: string;           // Endprodukt-Name (z.B. "GFKC Klassik")
    plannedAnnualSales: number;    // Geplanter Jahresabsatz in Litern
    priority: number;               // Priorität (1 = höchste, für Produktionsauftrag-Simulation)
  };
}

/**
 * Gebinde-Empfehlung für Komponenten-Entnahme (FIFO)
 */
export interface ContainerRecommendation {
  containerId: string;              // Tank/Gebinde-ID (z.B. "T-341", "Fass-1")
  containerType: string;            // Typ (Tank, Fass, Ballon, etc.)
  quantityToTake: number;           // Zu entnehmende Menge (Liter)
  remainingAfter: number;           // Verbleibende Menge nach Entnahme (Liter)
  isFull: boolean;                  // Wird komplett geleert?
  currentQuantity: number;          // Aktueller Füllstand vor Entnahme (Liter)
}

/**
 * Komponenten-Details - Dual-Mode für Reichweite & Produktionsplanung
 * 
 * Legacy-Felder (für Reichweite):
 * - requiredPerBatch, possibleBatches, daysUntilEmpty
 * 
 * Neue Felder (für Produktionsplanung):
 * - requiredForProduction, maxProductionLiters, containers
 */
export interface ComponentDetail {
  componentName: string;            // Name der Zutat/Komponente
  category?: string;                // Kategorie (M, Dest, etc.)
  availableQuantity: number;        // Verfügbare Menge im Lager gesamt (Liter)
  
  // Legacy: Batch-basierte Reichweite
  requiredPerBatch?: number;        // Benötigte Menge pro Rezept-Batch (Liter)
  possibleBatches?: number;         // Wie viele Batches möglich
  daysUntilEmpty?: number;          // Geschätzte Tage bis Komponente leer
  
  // Neu: Produktionsplanung
  requiredForProduction?: number;   // Benötigte Menge für Ziel-Produktion (Liter)
  maxProductionLiters?: number;     // Maximale Produktionsmenge mit dieser Komponente (Liter)
  containers?: ContainerRecommendation[]; // Empfohlene Gebinde für Entnahme (FIFO)
  
  // Common
  isBottleneck: boolean;            // Ist diese Komponente der Engpass?
  criticality: 'ok' | 'low' | 'critical'; // Status-Indikator
}

/**
 * Produktionsplanung für spezifische Menge
 */
export interface ProductionPlan {
  targetQuantity: number;           // Gewünschte Produktionsmenge (Liter)
  actualQuantity: number;           // Tatsächlich mögliche Menge (Liter)
  isPossible: boolean;              // Kann vollständig produziert werden?
  scalingFactor: number;            // Skalierungsfaktor von Rezept-Basis
  componentRequirements: ComponentDetail[]; // Was wird benötigt?
  limitingComponent?: string;       // Welche Komponente limitiert?
  missingQuantity?: number;         // Fehlende Menge der limitierenden Komponente
}

/**
 * Ergebnis der Reichweiten-Berechnung
 */
export interface RangeCalculationResult {
  // Hauptmetriken
  totalAvailableGFKC: number;       // Verfügbarer GFKC im Lager (Liter)
  productionPotential: number;      // Maximales Produktionspotential (Liter)
  totalPotential: number;           // Gesamt: Lager + Produktionspotential (Liter)
  rangeInDays: number;              // Reichweite in Tagen
  rangeInYears: number;             // Reichweite in Jahren
  
  // Engpass-Analyse
  bottleneckIngredient: string;     // Name der limitierenden Komponente
  bottleneckQuantity: number;       // Verfügbare Menge des Engpasses
  criticalIngredients: string[];    // Liste kritischer Komponenten (<10% Reichweite)
  
  // Detaillierte Komponenten-Info
  componentDetails: ComponentDetail[];
  
  // Produktionsplanung (optional)
  productionPlan?: ProductionPlan;  // Wenn Ziel-Menge angegeben
  
  // Zusatz-Infos
  recipeName: string;               // Name der analysierten Rezeptur
  plannedAnnualSales: number;       // Geplanter Jahresabsatz (Liter)
  dailyConsumption: number;         // Durchschnittlicher Tagesverbrauch (Liter)
  
  // Zeitstempel
  calculatedAt: string;             // Zeitpunkt der Berechnung
}

/**
 * Multi-Rezeptur-Analyse (alle reichweitenrelevanten Rezepte)
 */
export interface MultiRecipeRangeResult {
  recipes: Map<string, RangeCalculationResult>;  // Recipe ID -> Result
  globalBottlenecks: string[];                   // Komponenten die mehrere Rezepte limitieren
  totalLagerGFKC: number;                        // Gesamter GFKC-Bestand im Lager
  sharedComponents: string[];                    // Komponenten die von mehreren Rezepten genutzt werden
  calculatedAt: string;
}

/**
 * Produktionsauftrag (vereinfacht, ohne Anbauplanung)
 */
export interface ProductionOrder {
  recipeId: string;
  recipeName: string;
  plannedQuantity: number;          // Gewünschte Produktionsmenge (Liter)
  possibleQuantity: number;         // Tatsächlich mögliche Menge (Liter)
  isPossible: boolean;              // Kann produziert werden mit aktuellem Lager?
  missingComponents: {              // Fehlende Komponenten
    name: string;
    missing: number;
  }[];
  rangeImpact: {                    // Auswirkung auf Reichweite
    beforeProduction: number;       // Reichweite vorher (Tage)
    afterProduction: number;        // Reichweite nachher (Tage)
    delta: number;                  // Veränderung (Tage)
  };
}

// ============================================================================
// INVENTORY ITEM INTERFACE (für Typsicherheit)
// ============================================================================

export interface InventoryItem {
  id: string;
  tankNr?: string;              // Tank-Nummer (z.B. "T 341", "B-1", "Fass-3")
  produktName: string;
  currentQuantityLiters: number;
  alcoholVolProzent?: number;
  category?: string;
}

// ============================================================================
// RANGE CALCULATOR CLASS
// ============================================================================

export class RangeCalculator {
  private inventory: InventoryItem[];
  private recipes: RangeRelevantRecipe[];

  constructor(inventory: InventoryItem[], recipes: RangeRelevantRecipe[]) {
    this.inventory = inventory;
    this.recipes = recipes.filter(r => r.isRangeRelevant);
  }

  /**
   * Hauptfunktion: Berechnet Reichweite für eine spezifische Rezeptur
   * 
   * @param recipeId Rezept-ID
   * @param targetProductionLiters Optional: Ziel-Produktionsmenge für Produktionsplanung
   * @param manualOverrides Optional: Manuelle Mengen-Überschreibungen
   */
  public calculateRange(
    recipeId: string, 
    targetProductionLiters?: number,
    manualOverrides?: Map<string, number>
  ): RangeCalculationResult | null {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.rangeMetadata) {
      console.error(`Rezept ${recipeId} nicht gefunden oder nicht reichweitenrelevant`);
      return null;
    }

    // 1. Verfügbaren GFKC im Lager ermitteln
    const totalAvailableGFKC = this.calculateAvailableGFKC();

    // 2. Komponenten analysieren und Engpässe finden (mit manuellen Überschreibungen)
    const componentDetails = this.analyzeComponents(recipe, manualOverrides);

    // 3. Produktionspotential basierend auf Komponenten
    const productionPotential = this.calculateProductionPotential(recipe, componentDetails);

    // 4. Gesamtpotential
    const totalPotential = totalAvailableGFKC + productionPotential;

    // 5. Reichweite berechnen
    const plannedAnnualSales = recipe.rangeMetadata.plannedAnnualSales;
    const dailyConsumption = plannedAnnualSales / 365;
    const rangeInDays = dailyConsumption > 0 ? totalPotential / dailyConsumption : Infinity;
    const rangeInYears = rangeInDays / 365;

    // 6. Engpass identifizieren
    const bottleneck = componentDetails.reduce((min, comp) => 
      (comp.possibleBatches ?? Infinity) < (min.possibleBatches ?? Infinity) ? comp : min
    );

    // 7. Kritische Komponenten (<10% Reichweite = <36,5 Tage bei 1-Jahres-Reichweite)
    const criticalThreshold = rangeInDays * 0.1;
    const criticalIngredients = componentDetails
      .filter(comp => comp.daysUntilEmpty && comp.daysUntilEmpty < criticalThreshold)
      .map(comp => comp.componentName);

    // 8. Produktionsplanung (wenn Ziel-Menge angegeben)
    let productionPlan: ProductionPlan | undefined;
    if (targetProductionLiters && targetProductionLiters > 0) {
      productionPlan = this.calculateProductionPlan(recipe, targetProductionLiters, manualOverrides);
    }

    return {
      totalAvailableGFKC,
      productionPotential,
      totalPotential,
      rangeInDays,
      rangeInYears,
      bottleneckIngredient: bottleneck.componentName,
      bottleneckQuantity: bottleneck.availableQuantity,
      criticalIngredients,
      componentDetails,
      productionPlan,
      recipeName: recipe.rangeMetadata.productName,
      plannedAnnualSales,
      dailyConsumption,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Berechnet alle reichweitenrelevanten Rezepte (Multi-Rezeptur-Analyse)
   */
  public calculateAllRanges(): MultiRecipeRangeResult {
    const results = new Map<string, RangeCalculationResult>();
    const globalBottlenecks = new Set<string>();
    const sharedComponents = new Set<string>();

    // Komponenten-Verwendung tracken
    const componentUsage = new Map<string, number>();

    for (const recipe of this.recipes) {
      if (!recipe.id || !recipe.rangeMetadata) continue;

      const result = this.calculateRange(recipe.id);
      if (result) {
        results.set(recipe.id, result);

        // Bottleneck tracken
        globalBottlenecks.add(result.bottleneckIngredient);

        // Komponenten-Verwendung tracken
        result.componentDetails.forEach(comp => {
          const count = componentUsage.get(comp.componentName) || 0;
          componentUsage.set(comp.componentName, count + 1);
        });
      }
    }

    // Shared Components identifizieren (von mehreren Rezepten genutzt)
    componentUsage.forEach((count, component) => {
      if (count > 1) {
        sharedComponents.add(component);
      }
    });

    return {
      recipes: results,
      globalBottlenecks: Array.from(globalBottlenecks),
      totalLagerGFKC: this.calculateAvailableGFKC(),
      sharedComponents: Array.from(sharedComponents),
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Simuliert einen Produktionsauftrag (vereinfacht)
   */
  public simulateProductionOrder(
    recipeId: string,
    plannedQuantity: number
  ): ProductionOrder | null {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.rangeMetadata) {
      return null;
    }

    // Reichweite VORHER berechnen
    const rangeBefore = this.calculateRange(recipeId);
    if (!rangeBefore) return null;

    // Prüfe Verfügbarkeit aller Komponenten
    const componentDetails = this.analyzeComponents(recipe);
    const missingComponents: { name: string; missing: number }[] = [];

    let possibleQuantity = plannedQuantity;

    // Für jede Komponente prüfen
    componentDetails.forEach(comp => {
      // Wie viele Batches können wir mit dieser Komponente machen?
      const maxBatches = comp.possibleBatches ?? 0;
      const yieldPerBatch = this.getRecipeYield(recipe);
      const maxQuantity = maxBatches * yieldPerBatch;

      if (maxQuantity < plannedQuantity) {
        // Diese Komponente limitiert
        possibleQuantity = Math.min(possibleQuantity, maxQuantity);
        
        const requiredTotal = (plannedQuantity / yieldPerBatch) * (comp.requiredPerBatch ?? 0);
        const missing = requiredTotal - comp.availableQuantity;
        
        if (missing > 0) {
          missingComponents.push({
            name: comp.componentName,
            missing: Math.round(missing * 100) / 100,
          });
        }
      }
    });

    const isPossible = missingComponents.length === 0;

    // Simuliere Reichweite NACHHER (wenn Produktion durchgeführt wird)
    let rangeAfter = rangeBefore.rangeInDays;
    if (isPossible && possibleQuantity > 0) {
      // Neue Verfügbarmenge = Alt + Produktion
      const newTotal = rangeBefore.totalPotential + possibleQuantity;
      rangeAfter = newTotal / rangeBefore.dailyConsumption;
    }

    return {
      recipeId,
      recipeName: recipe.rangeMetadata.productName,
      plannedQuantity,
      possibleQuantity: Math.round(possibleQuantity * 100) / 100,
      isPossible,
      missingComponents,
      rangeImpact: {
        beforeProduction: Math.round(rangeBefore.rangeInDays),
        afterProduction: Math.round(rangeAfter),
        delta: Math.round(rangeAfter - rangeBefore.rangeInDays),
      },
    };
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Berechnet verfügbaren GFKC im Lager (FERTIGPRODUKT, Priorität 1)
   * Sucht nach: "GFKC", "GFKC-Mazerat", "Grundfruchtlikörkonzentrat"
   */
  private calculateAvailableGFKC(): number {
    return this.inventory
      .filter(item => {
        const name = item.produktName?.toLowerCase() || '';
        const category = item.category?.toLowerCase() || '';
        
        // Suche nach GFKC als Fertigprodukt
        const isGFKC = name.includes('gfkc') || 
                       name.includes('grundfruchtlikör') ||
                       name === 'grundfruchtlikörkonzentrat';
        
        // Nur Mazerat-Kategorie (fertiges Produkt), NICHT Destillat oder Rohstoffe
        const isFertig = category.includes('m') || category.includes('mazerat');
        
        return isGFKC && isFertig;
      })
      .reduce((sum, item) => sum + (item.currentQuantityLiters || 0), 0);
  }

  /**
   * Prüft ob eine Komponente unbegrenzt verfügbar ist (z.B. Wasser)
   */
  private isUnlimitedResource(componentName: string): boolean {
    const name = componentName.toLowerCase();
    const unlimitedResources = [
      'wasser',
      'leitungswasser',
      'trinkwasser',
      'destilliertes wasser',
      'osmosewasser',
    ];
    return unlimitedResources.some(resource => name.includes(resource));
  }

  /**
   * Analysiert alle Komponenten einer Rezeptur
   */
  private analyzeComponents(recipe: RangeRelevantRecipe, manualOverrides?: Map<string, number>): ComponentDetail[] {
    const details: ComponentDetail[] = [];

    if (!recipe.komponenten || recipe.komponenten.length === 0) {
      return details;
    }

    // Für jede Komponente im Rezept
    for (const comp of recipe.komponenten) {
      const componentName = comp.produktName;
      const requiredPerBatch = comp.mengeInLiter; // Liter pro Batch

      // Prüfe ob unbegrenzt verfügbar (z.B. Wasser)
      if (this.isUnlimitedResource(componentName)) {
        // Unbegrenzte Ressourcen werden nicht als Bottleneck gewertet
        details.push({
          componentName,
          availableQuantity: Infinity,
          requiredPerBatch: Math.round(requiredPerBatch * 100) / 100,
          possibleBatches: Infinity,
          isBottleneck: false,
          criticality: 'ok',
          daysUntilEmpty: undefined,
        });
        continue;
      }

      // Manuelle Überschreibung prüfen
      let availableQuantity: number;
      let category: string | undefined;
      
      // Verfügbare Menge im Lager finden - SUMMIERE ALLE ITEMS mit gleichem Produktnamen!
      // (Ein Produkt kann über mehrere Tanks verteilt sein)
      const inventoryItems = this.inventory.filter(item => 
        item.produktName?.toLowerCase() === componentName.toLowerCase()
      );
      
      // Kategorie vom ersten Item nehmen
      category = inventoryItems[0]?.category;
      
      if (manualOverrides && manualOverrides.has(componentName)) {
        availableQuantity = manualOverrides.get(componentName)!;
      } else {
        // SUMME aller Mengen (kann über mehrere Tanks verteilt sein)
        availableQuantity = inventoryItems.reduce((sum, item) => 
          sum + (item.currentQuantityLiters || 0), 0
        );
      }

      // Wie viele Batches sind möglich?
      const possibleBatches = requiredPerBatch > 0 
        ? Math.floor(availableQuantity / requiredPerBatch)
        : Infinity;

      // Kritikalität bestimmen (mit konfigurierbaren Schwellenwerten)
      let criticality: 'ok' | 'low' | 'critical' = 'ok';
      if (possibleBatches <= CRITICAL_THRESHOLD) {
        criticality = 'critical';
      } else if (possibleBatches < LOW_THRESHOLD) {
        criticality = 'low';
      }

      // Tage bis leer (vereinfachte Schätzung)
      const dailyUsage = recipe.rangeMetadata 
        ? recipe.rangeMetadata.plannedAnnualSales / 365 
        : 0;
      const daysUntilEmpty = dailyUsage > 0 
        ? (availableQuantity / dailyUsage) * 365
        : undefined;

      details.push({
        componentName,
        category,
        availableQuantity: Math.round(availableQuantity * 100) / 100,
        requiredPerBatch: Math.round(requiredPerBatch * 100) / 100,
        possibleBatches,
        isBottleneck: false, // wird später gesetzt
        criticality,
        daysUntilEmpty: daysUntilEmpty ? Math.round(daysUntilEmpty) : undefined,
      });
    }

    // Bottleneck markieren (Komponente mit wenigsten möglichen Batches)
    // Ignoriere unbegrenzte Ressourcen (Infinity)
    if (details.length > 0) {
      const limitedComponents = details.filter(comp => comp.possibleBatches !== undefined && comp.possibleBatches !== Infinity);
      if (limitedComponents.length > 0) {
        const bottleneck = limitedComponents.reduce((min, comp) => 
          (comp.possibleBatches ?? Infinity) < (min.possibleBatches ?? Infinity) ? comp : min
        );
        bottleneck.isBottleneck = true;
      }
    }

    return details;
  }

  /**
   * Berechnet Produktionspotential basierend auf Komponenten
   */
  private calculateProductionPotential(
    recipe: RangeRelevantRecipe,
    componentDetails: ComponentDetail[]
  ): number {
    if (componentDetails.length === 0) {
      return 0;
    }

    // Finde die limitierende Komponente (Bottleneck)
    // Ignoriere unbegrenzte Ressourcen
    const limitedComponents = componentDetails.filter(comp => comp.possibleBatches !== undefined && comp.possibleBatches !== Infinity);
    if (limitedComponents.length === 0) {
      return Infinity; // Alle Komponenten unbegrenzt verfügbar
    }
    
    const bottleneck = limitedComponents.reduce((min, comp) => 
      (comp.possibleBatches ?? Infinity) < (min.possibleBatches ?? Infinity) ? comp : min
    );

    // Produktionspotential = Mögliche Batches × Ertrag pro Batch
    const yieldPerBatch = this.getRecipeYield(recipe);
    const productionPotential = (bottleneck.possibleBatches ?? 0) * yieldPerBatch;

    return Math.round(productionPotential * 100) / 100;
  }

  /**
   * Berechnet Produktionsplan für spezifische Ziel-Menge
   * 
   * Zeigt OHNE Batches:
   * - Was wird für X Liter benötigt
   * - Aus welchen Gebinden entnehmen (FIFO)
   * - Was limitiert die Produktion
   */
  private calculateProductionPlan(
    recipe: RangeRelevantRecipe,
    targetQuantity: number,
    manualOverrides?: Map<string, number>
  ): ProductionPlan {
    
    const { generateContainerRecommendations } = require('./production-planning');
    
    // Rezept-Basisertrag ermitteln
    const recipeYield = this.getRecipeYield(recipe);
    if (recipeYield === 0) {
      return {
        targetQuantity,
        actualQuantity: 0,
        isPossible: false,
        scalingFactor: 0,
        componentRequirements: [],
        limitingComponent: 'Rezept hat keinen Ertrag',
        missingQuantity: targetQuantity,
      };
    }

    // Skalierungsfaktor berechnen
    const scalingFactor = targetQuantity / recipeYield;

    // Für jede Komponente: Benötigte Menge berechnen
    const componentRequirements: ComponentDetail[] = [];
    let maxPossibleQuantity = Infinity;
    let limitingComponent: string | undefined;

    if (!recipe.komponenten || recipe.komponenten.length === 0) {
      return {
        targetQuantity,
        actualQuantity: 0,
        isPossible: false,
        scalingFactor,
        componentRequirements: [],
        limitingComponent: 'Keine Komponenten im Rezept',
        missingQuantity: targetQuantity,
      };
    }

    for (const comp of recipe.komponenten) {
      const componentName = comp.produktName;
      const requiredForProduction = comp.mengeInLiter * scalingFactor;

      // Unbegrenzte Ressourcen
      if (this.isUnlimitedResource(componentName)) {
        componentRequirements.push({
          componentName,
          availableQuantity: Infinity,
          requiredForProduction: Math.round(requiredForProduction * 100) / 100,
          isBottleneck: false,
          criticality: 'ok',
          maxProductionLiters: Infinity,
        });
        continue;
      }

      // Verfügbare Menge ermitteln
      const inventoryItems = this.inventory.filter(item => 
        item.produktName?.toLowerCase() === componentName.toLowerCase()
      );
      
      const category = inventoryItems[0]?.category;
      
      let availableQuantity: number;
      if (manualOverrides && manualOverrides.has(componentName)) {
        availableQuantity = manualOverrides.get(componentName)!;
      } else {
        availableQuantity = inventoryItems.reduce((sum, item) => 
          sum + (item.currentQuantityLiters || 0), 0
        );
      }

      // Maximale Produktionsmenge mit dieser Komponente
      const maxWithThisComponent = (availableQuantity / comp.mengeInLiter) * recipeYield;

      // Kritikalität
      let criticality: 'ok' | 'low' | 'critical' = 'ok';
      if (availableQuantity < requiredForProduction) {
        criticality = 'critical';
      } else if (availableQuantity < requiredForProduction * 1.2) {
        criticality = 'low';
      }

      // Gebinde-Empfehlungen (FIFO)
      const containers = generateContainerRecommendations(
        componentName,
        requiredForProduction,
        this.inventory
      );

      componentRequirements.push({
        componentName,
        category,
        availableQuantity: Math.round(availableQuantity * 100) / 100,
        requiredForProduction: Math.round(requiredForProduction * 100) / 100,
        isBottleneck: false, // wird später gesetzt
        criticality,
        maxProductionLiters: Math.round(maxWithThisComponent * 100) / 100,
        containers,
      });

      // Limitierende Komponente finden
      if (maxWithThisComponent < maxPossibleQuantity) {
        maxPossibleQuantity = maxWithThisComponent;
        limitingComponent = componentName;
      }
    }

    // Bottleneck markieren
    if (limitingComponent) {
      const bottleneck = componentRequirements.find(c => c.componentName === limitingComponent);
      if (bottleneck) {
        bottleneck.isBottleneck = true;
      }
    }

    // Tatsächliche Produktionsmenge
    const actualQuantity = Math.min(targetQuantity, maxPossibleQuantity);
    const isPossible = actualQuantity >= targetQuantity;
    const missingQuantity = isPossible ? 0 : (targetQuantity - actualQuantity);

    return {
      targetQuantity,
      actualQuantity: Math.round(actualQuantity * 100) / 100,
      isPossible,
      scalingFactor: Math.round(scalingFactor * 100) / 100,
      componentRequirements,
      limitingComponent,
      missingQuantity: Math.round(missingQuantity * 100) / 100,
    };
  }

  /**
   * Ermittelt den Ertrag pro Rezept-Batch
   */
  private getRecipeYield(recipe: RangeRelevantRecipe): number {
    // Falls explizit im Ergebnis angegeben
    if (recipe.ergebnis?.gesamtMengeLiter) {
      return recipe.ergebnis.gesamtMengeLiter;
    }

    // Fallback: basisMenge
    if (recipe.basisMenge) {
      return recipe.basisMenge;
    }

    // Fallback: Summe aller Komponenten
    if (recipe.komponenten && recipe.komponenten.length > 0) {
      return recipe.komponenten.reduce((sum: number, comp) => sum + comp.mengeInLiter, 0);
    }

    return 0;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Schnellzugriff: Berechne Reichweite für ein Rezept
 */
export function calculateRecipeRange(
  recipeId: string,
  inventory: InventoryItem[],
  recipes: RangeRelevantRecipe[]
): RangeCalculationResult | null {
  const calculator = new RangeCalculator(inventory, recipes);
  return calculator.calculateRange(recipeId);
}

/**
 * Schnellzugriff: Berechne alle Reichweiten
 */
export function calculateAllRecipeRanges(
  inventory: InventoryItem[],
  recipes: RangeRelevantRecipe[]
): MultiRecipeRangeResult {
  const calculator = new RangeCalculator(inventory, recipes);
  return calculator.calculateAllRanges();
}

/**
 * Schnellzugriff: Simuliere Produktionsauftrag
 */
export function simulateProduction(
  recipeId: string,
  plannedQuantity: number,
  inventory: InventoryItem[],
  recipes: RangeRelevantRecipe[]
): ProductionOrder | null {
  const calculator = new RangeCalculator(inventory, recipes);
  return calculator.simulateProductionOrder(recipeId, plannedQuantity);
}
