"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Package, Droplets, TrendingUp } from 'lucide-react';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import { hybridStorage } from '@/lib/hybrid-storage';

type CategoryStats = {
  category: string;
  count: number;
  totalLiters: number;
  totalLA: number;
  products?: Array<{ name: string; liters: number; percentage: number }>; // Für Mazerat-Verteilung
};

const COLORS: Record<string, string> = {
  'Mazerat': '#10b981',    // emerald-500
  'Destillat': '#3b82f6',  // blue-500
  'Sprit': '#f59e0b',      // amber-500
  'Sonstige': '#6b7280',   // gray-500
};

const formatNumber = (num: number | undefined | null, precision: number = 2) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString('de-DE', { minimumFractionDigits: precision, maximumFractionDigits: precision });
};

// Normalisiere Kategorien: M/D/Dest/Sbl → Mazerat/Destillat/Sprit
const normalizeCategory = (category: string | undefined, produktName?: string): string => {
  if (!category) return 'Mazerat'; // Default
  const cat = category.trim().toLowerCase();
  const product = produktName?.trim().toLowerCase() || '';
  
  // Sprit ist ein Ausgangsstoff, extra behandeln
  if (product === 'sprit') return 'Sprit';
  
  // Mazerat-Varianten
  if (cat === 'm' || cat === 'mazerat') return 'Mazerat';
  
  // Destillat-Varianten (inkl. Sbl = Sauvignon Blanc Destillat)
  if (cat === 'd' || cat === 'dest' || cat === 'destillat' || cat === 'sbl' || cat === 'sbl.') return 'Destillat';
  
  // Fallback: Wenn unbekannt, als Mazerat behandeln
  return 'Mazerat';
};

export default function InventoryStatsWidget() {
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [totalSorts, setTotalSorts] = useState(0);
  const [totalLA, setTotalLA] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mazeratProducts, setMazeratProducts] = useState<Array<{ name: string; liters: number; percentage: number }>>([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const items = await hybridStorage.get<StoredInventoryItem[]>('inventoryItems') || [];
        
        // Berechne Statistiken nach Kategorie
        const categoryMap = new Map<string, CategoryStats>();
        const uniqueProducts = new Set<string>();
        let sumLA = 0;
        
        // Sammle Mazerat-Produkte für gestapelten Balken
        const mazeratProductMap = new Map<string, number>();

    items.forEach(item => {
      const category = normalizeCategory(item.category, item.produktName);
      const productKey = `${item.produktName}::${category}`;
      uniqueProducts.add(productKey);          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              category,
              count: 0,
              totalLiters: 0,
              totalLA: 0,
            });
          }

          const stat = categoryMap.get(category)!;
          stat.count += 1;
          stat.totalLiters += item.currentQuantityLiters || 0;
          const la = (item.currentQuantityLiters || 0) * ((item.alcoholVolProzent || 0) / 100);
          stat.totalLA += la;
          sumLA += la;
          
          // Sammle Mazerat-Produkte für gestapelten Balken
          if (category === 'Mazerat') {
            const productName = item.produktName || 'Unbekannt';
            const currentLiters = mazeratProductMap.get(productName) || 0;
            mazeratProductMap.set(productName, currentLiters + (item.currentQuantityLiters || 0));
          }
        });

        // Mazerat, Destillat und Sprit anzeigen, in dieser Reihenfolge
        const statsArray = Array.from(categoryMap.values())
          .filter(s => s.category === 'Mazerat' || s.category === 'Destillat' || s.category === 'Sprit')
          .sort((a, b) => {
            // Sortierung: Mazerat, Destillat, Sprit
            const order: Record<string, number> = { 'Mazerat': 1, 'Destillat': 2, 'Sprit': 3 };
            return (order[a.category] || 999) - (order[b.category] || 999);
          });

        setStats(statsArray);
        setTotalSorts(uniqueProducts.size);
        setTotalLA(sumLA);
        
        // Berechne Mazerat-Produktverteilung in %
        const mazeratTotal = statsArray.find(s => s.category === 'Mazerat')?.totalLiters || 0;
        const mazeratProds = Array.from(mazeratProductMap.entries())
          .map(([name, liters]) => ({
            name,
            liters,
            percentage: mazeratTotal > 0 ? (liters / mazeratTotal) * 100 : 0
          }))
          .sort((a, b) => b.liters - a.liters); // Sortiere nach Menge absteigend
        setMazeratProducts(mazeratProds);
        
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Lagerstatistik:', error);
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Statistik lädt...</div>
        </CardContent>
      </Card>
    );
  }

  // Daten für Bar Chart vorbereiten
  const chartData = stats.map(stat => {
    const data: any = {
      name: stat.category,
      'LA (L)': stat.totalLA,
    };
    
    // Für Mazerat: Einzelne Produkte als gestapelte Balken
    if (stat.category === 'Mazerat' && mazeratProducts.length > 0) {
      mazeratProducts.forEach(product => {
        data[product.name] = product.liters;
      });
    } else {
      // Für andere Kategorien: Normale Liter-Anzeige
      data['Liter'] = stat.totalLiters;
    }
    
    return data;
  });
  
  // Grünabstufungen für Mazerat-Produkte
  const greenShades = [
    '#6ee7b7', // emerald-300
    '#34d399', // emerald-400
    '#10b981', // emerald-500
    '#059669', // emerald-600
    '#047857', // emerald-700
    '#065f46', // emerald-800
  ];

  return (
    <div className="space-y-6">
      {/* Übersichts-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-md border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sorten im Lager</p>
                <p className="text-3xl font-bold text-primary">{totalSorts}</p>
              </div>
              <Package className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-l-emerald-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mazerat (Liter)</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatNumber(stats.find(s => s.category === 'Mazerat')?.totalLiters || 0, 1)}
                </p>
              </div>
              <Droplets className="h-10 w-10 text-emerald-500 opacity-20" />
            </div>
            {/* Gestapelter Balken für Mazerat-Sorten */}
            {mazeratProducts.length > 0 && (
              <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden flex">
                {mazeratProducts.map((product, idx) => {
                  // Grünabstufungen von hell bis dunkel
                  const greenShades = [
                    '#6ee7b7', // emerald-300
                    '#34d399', // emerald-400
                    '#10b981', // emerald-500
                    '#059669', // emerald-600
                    '#047857', // emerald-700
                    '#065f46', // emerald-800
                  ];
                  const color = greenShades[idx % greenShades.length];
                  
                  return (
                    <div
                      key={product.name}
                      style={{ 
                        width: `${product.percentage}%`,
                        backgroundColor: color
                      }}
                      className="h-full relative group"
                      title={`${product.name}: ${formatNumber(product.liters, 1)} L (${formatNumber(product.percentage, 1)}%)`}
                    >
                      {/* Tooltip auf Hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {product.name}: {formatNumber(product.liters, 1)} L ({formatNumber(product.percentage, 1)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Destillat (Liter)</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatNumber(stats.find(s => s.category === 'Destillat')?.totalLiters || 0, 1)}
                </p>
              </div>
              <Droplets className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sprit (Liter)</p>
                <p className="text-3xl font-bold text-amber-600">
                  {formatNumber(stats.find(s => s.category === 'Sprit')?.totalLiters || 0, 1)}
                </p>
              </div>
              <Droplets className="h-10 w-10 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gesamt LA (Liter)</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatNumber(totalLA, 1)}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailtabelle und Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabelle */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-primary">
              <TrendingUp className="mr-2 h-5 w-5" />
              Lagerbestand nach Kategorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-right">Chargen</TableHead>
                  <TableHead className="text-right">Liter</TableHead>
                  <TableHead className="text-right">LA (L)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.category}>
                    <TableCell className="font-medium">
                      <span 
                        className="inline-block w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[stat.category] || COLORS['Sonstige'] }}
                      />
                      {stat.category}
                    </TableCell>
                    <TableCell className="text-right">{stat.count}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.totalLiters, 1)}</TableCell>
                    <TableCell className="text-right">{formatNumber(stat.totalLA, 2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>GESAMT</TableCell>
                  <TableCell className="text-right">{stats.reduce((sum, s) => sum + s.count, 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(stats.reduce((sum, s) => sum + s.totalLiters, 0), 1)}</TableCell>
                  <TableCell className="text-right">{formatNumber(totalLA, 2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-primary">
              <TrendingUp className="mr-2 h-5 w-5" />
              Mengenverhältnis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${formatNumber(value, 1)} L`,
                    name
                  ]}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                />
                <Legend />
                
                {/* Mazerat-Produkte als gestapelte Balken */}
                {mazeratProducts.map((product, idx) => (
                  <Bar 
                    key={product.name}
                    dataKey={product.name}
                    stackId="mazerat"
                    fill={greenShades[idx % greenShades.length]}
                  />
                ))}
                
                {/* Normale Liter-Balken für Destillat und Sprit */}
                <Bar dataKey="Liter" fill="#3b82f6" stackId="other">
                  {chartData.map((entry, index) => {
                    // Nur für Nicht-Mazerat-Kategorien
                    if (entry.name !== 'Mazerat') {
                      return <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS['Sonstige']} />;
                    }
                    return null;
                  })}
                </Bar>
                
                <Bar dataKey="LA (L)" fill="#9333ea" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
