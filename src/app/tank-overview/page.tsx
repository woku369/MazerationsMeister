"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Package
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import QRCode from 'qrcode';
import { hybridStorage } from '@/lib/hybrid-storage';

interface TankOverview {
  tankId: string;
  category?: string;
  sorte?: string;
  charge?: string;
  currentFill?: number;
  capacity?: number;
  fillPercentage?: number;
  status: 'leer' | 'teilweise' | 'voll' | 'überfüllt';
}

export default function TankOverviewPage() {
  const [tanks, setTanks] = useState<TankOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadTankData();
    
    // Listen for tank definition updates
    const handleTankUpdate = () => {
      console.log('🔄 Tank-Übersicht: Daten-Update erkannt, lade neu...');
      loadTankData();
    };
    
    window.addEventListener('tankDefinitionsUpdated', handleTankUpdate);
    
    return () => {
      window.removeEventListener('tankDefinitionsUpdated', handleTankUpdate);
    };
  }, []);

  const loadTankData = async () => {
    try {
      setLoading(true);
      
      // Load from hybridStorage (Electron + localStorage fallback)
      const tankData = await hybridStorage.get('tank-data') || [];
      const inventoryData = await hybridStorage.get('inventory-items') || [];
      
      console.log('✅ Tank-Daten geladen:', tankData.length, 'Container');
      console.log('✅ Inventar geladen:', inventoryData.length, 'Items');

      // Process stored data mit Inventar-Füllständen
      const processedTanks = tankData.map((tank: any) => {
        const capacity = tank.volumenLiter || tank.capacity || 0;
        
        // Berechne ECHTEN Füllstand aus Inventar
        const tankInventory = inventoryData.filter((item: any) => 
          item.tankNr === tank.id || 
          item.tankNr === tank.tankNr ||
          item.tankNr === tank.bezeichnung
        );
        const currentFill = tankInventory.reduce((sum: number, item: any) => 
          sum + (item.currentQuantityLiters || item.menge || 0), 0
        );
        
        // Hole aktuellen Inhalt (größte Position)
        const mainContent = tankInventory.length > 0 
          ? tankInventory.sort((a: any, b: any) => 
              (b.currentQuantityLiters || 0) - (a.currentQuantityLiters || 0)
            )[0]
          : null;
        
        const fillPercentage = capacity > 0 ? Math.round((currentFill / capacity) * 100) : 0;
        
        return {
          tankId: tank.id || tank.bezeichnung || tank.tankNr,
          category: tank.category,
          sorte: mainContent?.sorte || tank.currentContent || tank.sorte || '-',
          charge: mainContent?.charge || tank.charge || '-',
          currentFill,
          capacity,
          fillPercentage,
          status: fillPercentage === 0 ? 'leer' 
            : fillPercentage < 50 ? 'teilweise'
            : fillPercentage < 95 ? 'voll'
            : 'überfüllt'
        };
      });

      setTanks(processedTanks);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load tank data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'leer': return 'bg-gray-100 text-gray-800';
      case 'teilweise': return 'bg-yellow-100 text-yellow-800';
      case 'voll': return 'bg-green-100 text-green-800';
      case 'überfüllt': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'leer': return <AlertCircle className="h-4 w-4" />;
      case 'teilweise': return <Package className="h-4 w-4" />;
      case 'voll': return <CheckCircle className="h-4 w-4" />;
      case 'überfüllt': return <TrendingUp className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string | undefined) => {
    return category === 'Mazerat' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  // Statistics
  const stats = {
    total: tanks.length,
    leer: tanks.filter(t => t.status === 'leer').length,
    teilweise: tanks.filter(t => t.status === 'teilweise').length,
    voll: tanks.filter(t => t.status === 'voll').length,
    überfüllt: tanks.filter(t => t.status === 'überfüllt').length,
    totalCapacity: tanks.reduce((sum, t) => sum + (t.capacity || 0), 0),
    totalFill: tanks.reduce((sum, t) => sum + (t.currentFill || 0), 0),
  };

  const avgFillPercentage = stats.total > 0 
    ? Math.round((stats.totalFill / stats.totalCapacity) * 100)
    : 0;

  const exportToCSV = () => {
    const headers = ['Tank-Nr', 'Kategorie', 'Sorte', 'Charge', 'Füllstand (L)', 'Kapazität (L)', 'Füllstand (%)', 'Status'];
    const rows = tanks.map(tank => [
      tank.tankId,
      tank.category || '',
      tank.sorte || '',
      tank.charge || '',
      tank.currentFill || 0,
      tank.capacity || 0,
      tank.fillPercentage || 0,
      tank.status
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tank-overview-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Lade Tank-Daten...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">📊 Tank-Übersicht</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadTankData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV Export
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Gesamtübersicht aller {stats.total} Container
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Letztes Update: {lastUpdate.toLocaleString('de-DE')}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Container</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Leer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.leer}</div>
            <p className="text-xs text-muted-foreground">{Math.round((stats.leer/stats.total)*100)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Teilweise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.teilweise}</div>
            <p className="text-xs text-muted-foreground">{Math.round((stats.teilweise/stats.total)*100)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Voll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.voll}</div>
            <p className="text-xs text-muted-foreground">{Math.round((stats.voll/stats.total)*100)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Kapazität</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.totalCapacity/1000)}k</div>
            <p className="text-xs text-muted-foreground">Liter gesamt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Füllstand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{avgFillPercentage}%</div>
            <p className="text-xs text-muted-foreground">Durchschnitt</p>
          </CardContent>
        </Card>
      </div>

      {/* Tank Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Container</CardTitle>
        </CardHeader>
        <CardContent>
          {tanks.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Keine Tank-Daten vorhanden</h3>
              <p className="text-muted-foreground mb-4">
                Bitte legen Sie zuerst Tanks im Inventar an, um hier eine Übersicht zu sehen.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/inventory'}>
                Zum Inventar
              </Button>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Tank-Nr</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Sorte</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead className="text-right">Füllstand</TableHead>
                  <TableHead className="text-right">Kapazität</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">QR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tanks.map((tank) => (
                  <TableRow key={tank.tankId}>
                    <TableCell className="font-mono font-semibold">
                      {tank.tankId}
                    </TableCell>
                    <TableCell>
                      {tank.category && (
                        <Badge variant="outline" className={getCategoryColor(tank.category)}>
                          {tank.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{tank.sorte || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {tank.charge || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tank.currentFill?.toLocaleString('de-DE')} L
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {tank.capacity?.toLocaleString('de-DE')} L
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (tank.fillPercentage || 0) < 50 ? 'bg-yellow-500' :
                              (tank.fillPercentage || 0) < 95 ? 'bg-green-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(tank.fillPercentage || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12 text-right">
                          {tank.fillPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(tank.status)} flex items-center gap-1 w-fit`}
                      >
                        {getStatusIcon(tank.status)}
                        {tank.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Open QR code view
                          window.open(
                            `/tank-viewer-secure.html?tank=${encodeURIComponent(tank.tankId)}`,
                            '_blank'
                          );
                        }}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <QrCode className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">
                💡 Master-QR für diese Seite
              </h4>
              <p className="text-sm text-blue-700">
                Diese Seite kann als <strong>Master-QR</strong> verwendet werden! 
                Scannen Sie einen QR-Code, der auf <code>/tank-overview</code> zeigt, 
                um diese Gesamtübersicht auf dem Smartphone anzuzeigen.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  try {
                    // IMMER GitHub Pages URL für Master-QR (tank-viewer-secure.html mit ?all Parameter)
                    const url = 'https://woku369.github.io/MazerationsMeister/tank-viewer-secure.html?view=all';
                    
                    const qrDataUrl = await QRCode.toDataURL(url, {
                      width: 512,
                      margin: 2,
                      color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                      }
                    });

                    // Create download link
                    const link = document.createElement('a');
                    link.href = qrDataUrl;
                    link.download = `Master-QR-Tank-Overview-${new Date().toISOString().split('T')[0]}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Show success message
                    alert('✅ Master-QR-Code wurde erfolgreich generiert und heruntergeladen!\n\nURL: ' + url);
                  } catch (error) {
                    console.error('QR-Code Fehler:', error);
                    alert('❌ Fehler beim Generieren des QR-Codes');
                  }
                }}
              >
                Master-QR generieren
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
