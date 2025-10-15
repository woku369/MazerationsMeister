"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Printer, Download, Grid3x3, List, Search, FileImage, CheckSquare } from 'lucide-react';
import QRCode from 'qrcode';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface TankQR {
  tankId: string;
  qrDataUrl: string;
  category?: string;
  currentContent?: string;
  volumenLiter?: number;
  currentFill?: number;
  lastUpdate?: string;
}

export default function QRAlbumPage() {
  const [tanks, setTanks] = useState<TankQR[]>([]);
  const [filteredTanks, setFilteredTanks] = useState<TankQR[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [selectedTanks, setSelectedTanks] = useState<Set<string>>(new Set());
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  useEffect(() => {
    loadTanks();
    
    // Listen for tank definition updates
    const handleTankUpdate = () => {
      console.log('🔄 QR-Album: Daten-Update erkannt, lade neu...');
      loadTanks();
    };
    
    window.addEventListener('tankDefinitionsUpdated', handleTankUpdate);
    
    return () => {
      window.removeEventListener('tankDefinitionsUpdated', handleTankUpdate);
    };
  }, []);

  useEffect(() => {
    // Filter tanks based on search
    if (searchQuery) {
      const filtered = tanks.filter(tank => 
        tank.tankId.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTanks(filtered);
    } else {
      setFilteredTanks(tanks);
    }
  }, [searchQuery, tanks]);

  const loadTanks = async () => {
    try {
      setLoading(true);
      
      // Load tank data AND inventory from localStorage
      const storedData = localStorage.getItem('tank-data');
      const storedInventory = localStorage.getItem('inventory-items');
      let tankData: any[] = [];
      let inventoryData: any[] = [];
      
      if (storedData) {
        try {
          tankData = JSON.parse(storedData);
        } catch {
          tankData = [];
        }
      }
      
      if (storedInventory) {
        try {
          inventoryData = JSON.parse(storedInventory);
        } catch {
          inventoryData = [];
        }
      }

      // KEINE DEMO-TANKS MEHR! Zeige nur echte Daten
      if (!tankData || tankData.length === 0) {
        console.warn('⚠️ Keine Tank-Daten gefunden. Bitte Tanks im Inventar anlegen.');
        setTanks([]);
        setFilteredTanks([]);
        setLoading(false);
        return;
      }

      // Generate QR codes for all tanks
      const qrPromises = tankData.map(async (tank: any) => {
        // IMMER GitHub Pages URL verwenden - NIEMALS localhost!
        const baseUrl = 'https://woku369.github.io/MazerationsMeister';
        
        const tankId = tank.id || tank.bezeichnung || tank.tankNr || 'Unknown';
        const qrUrl = `${baseUrl}/tank-viewer-secure.html?tank=${encodeURIComponent(tankId)}`;
        
        // Find current content and fill level from inventory
        const tankInventory = inventoryData.filter((item: any) => 
          item.tankNr === tank.id || 
          item.tankNr === tank.tankNr ||
          item.tankNr === tank.bezeichnung
        );
        
        // Calculate fill level
        const currentFill = tankInventory.reduce((sum: number, item: any) => 
          sum + (item.currentQuantityLiters || item.menge || 0), 0
        );
        
        // Get current content (first/largest position)
        const mainContent = tankInventory.length > 0 
          ? tankInventory.sort((a: any, b: any) => 
              (b.currentQuantityLiters || 0) - (a.currentQuantityLiters || 0)
            )[0]
          : null;
        
        try {
          const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });

          return {
            tankId,
            qrDataUrl,
            category: tank.category,
            currentContent: mainContent?.sorte || tank.currentContent || '-',
            volumenLiter: tank.volumenLiter,
            currentFill,
            lastUpdate: mainContent?.eingangsdatum || tank.lastUpdate || new Date().toISOString()
          };
        } catch (error) {
          console.error(`Failed to generate QR for ${tankId}:`, error);
          return null;
        }
      });

      const generatedQRs = await Promise.all(qrPromises);
      const validQRs = generatedQRs.filter(qr => qr !== null) as TankQR[];
      
      setTanks(validQRs);
      setFilteredTanks(validQRs);
    } catch (error) {
      console.error('Failed to load tanks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadAllQRs = async () => {
    // Create a zip file would be ideal, but for now just print
    alert('Tipp: Verwenden Sie die Druckfunktion (Strg+P) um alle QR-Codes als PDF zu speichern.');
    handlePrint();
  };

  const toggleTankSelection = (tankId: string) => {
    const newSelection = new Set(selectedTanks);
    if (newSelection.has(tankId)) {
      newSelection.delete(tankId);
    } else {
      newSelection.add(tankId);
    }
    setSelectedTanks(newSelection);
  };

  const selectAllTanks = () => {
    if (selectedTanks.size === filteredTanks.length) {
      setSelectedTanks(new Set());
    } else {
      setSelectedTanks(new Set(filteredTanks.map(t => t.tankId)));
    }
  };

  const exportAsJPG = async () => {
    const tanksToExport = showCheckboxes && selectedTanks.size > 0
      ? filteredTanks.filter(t => selectedTanks.has(t.tankId))
      : filteredTanks;

    if (tanksToExport.length === 0) {
      alert('Bitte wählen Sie mindestens einen Tank zum Exportieren aus.');
      return;
    }

    // 105mm hoch × 80mm breit bei 300 DPI = 1240×945 Pixel (Hochformat!)
    const labelWidth = 945;   // 80mm × 300 DPI / 25.4
    const labelHeight = 1240; // 105mm × 300 DPI / 25.4

    for (const tank of tanksToExport) {
      try {
        // Create canvas for label
        const canvas = document.createElement('canvas');
        canvas.width = labelWidth;
        canvas.height = labelHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) continue;

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, labelWidth, labelHeight);

        // Draw QR code (centered, 600x600px für 300 DPI Druckqualität)
        const qrSize = 600;
        const qrX = (labelWidth - qrSize) / 2;
        const qrY = 100;
        
        const qrImg = new Image();
        qrImg.src = tank.qrDataUrl;
        
        await new Promise((resolve) => {
          qrImg.onload = () => {
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            resolve(null);
          };
        });

        // Draw Tank ID (unten nach QR, fett, groß)
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(tank.tankId, labelWidth / 2, qrY + qrSize + 120);

        // Draw Capacity (darunter)
        if (tank.volumenLiter) {
          ctx.font = '60px Arial';
          ctx.fillText(`${tank.volumenLiter}L`, labelWidth / 2, qrY + qrSize + 200);
        }

        // Convert to JPG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QR_${tank.tankId}_105x80mm.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/jpeg', 0.95);

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Failed to export ${tank.tankId}:`, error);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <QrCode className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">QR-Codes werden generiert...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header - No Print */}
      <div className="mb-8 print:hidden">
        <h1 className="text-3xl font-bold mb-2">🗂️ QR-Code Album</h1>
        <p className="text-muted-foreground">
          Übersicht aller {tanks.length} Container-QR-Codes
        </p>
      </div>

      {/* Controls - No Print */}
      <Card className="mb-6 print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="w-full sm:w-auto flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tank suchen (z.B. T 341)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Raster
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                Liste
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant={showCheckboxes ? 'default' : 'outline'}
                onClick={() => {
                  setShowCheckboxes(!showCheckboxes);
                  if (showCheckboxes) setSelectedTanks(new Set());
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Auswählen
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Drucken
              </Button>
              <Button onClick={downloadAllQRs}>
                <Download className="h-4 w-4 mr-2" />
                Als PDF
              </Button>
              <Button variant="outline" onClick={exportAsJPG}>
                <FileImage className="h-4 w-4 mr-2" />
                JPG Export
              </Button>
            </div>
          </div>

          {/* Export Info & Select All */}
          {showCheckboxes && (
            <div className="mt-4 flex gap-4 items-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAllTanks}
              >
                {selectedTanks.size === filteredTanks.length ? 'Alle abwählen' : 'Alle auswählen'}
              </Button>
              <Badge variant="secondary">
                {selectedTanks.size} ausgewählt
              </Badge>
              <span className="text-sm text-muted-foreground">
                📐 Etikettengröße: 105×80mm
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex gap-4 text-sm">
            <Badge variant="outline">
              {filteredTanks.length} von {tanks.length} Tanks
            </Badge>
            {searchQuery && (
              <Badge variant="secondary">
                Gefiltert: "{searchQuery}"
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print Header - Only Print */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold mb-2">QR-Code Album - MazerationsMeister</h1>
        <p className="text-sm text-muted-foreground">
          Gesamt: {tanks.length} Container | Erstellt: {new Date().toLocaleDateString('de-DE')}
        </p>
      </div>

      {/* QR Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 print:grid-cols-4 print:gap-3">
          {filteredTanks.map((tank) => (
            <Card 
              key={tank.tankId} 
              className={`relative hover:shadow-lg transition-shadow print:break-inside-avoid ${
                showCheckboxes && selectedTanks.has(tank.tankId) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* Checkbox */}
              {showCheckboxes && (
                <div className="absolute top-2 right-2 z-10 print:hidden">
                  <Checkbox
                    checked={selectedTanks.has(tank.tankId)}
                    onCheckedChange={() => toggleTankSelection(tank.tankId)}
                    className="bg-white"
                  />
                </div>
              )}
              
              <CardHeader className="pb-2 print:pb-1">
                <CardTitle className="text-sm text-center font-mono">
                  {tank.tankId}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="aspect-square bg-white rounded-lg p-2 flex items-center justify-center">
                  <img 
                    src={tank.qrDataUrl} 
                    alt={`QR Code for ${tank.tankId}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Anzeige: Belegung, Volumen, Füllstand, Datum */}
                <div className="mt-2 space-y-1 text-xs text-center">
                  {tank.currentContent && (
                    <div className="font-semibold text-primary truncate" title={tank.currentContent}>
                      {tank.currentContent}
                    </div>
                  )}
                  {tank.volumenLiter && (
                    <div className="text-muted-foreground">
                      {tank.currentFill ? `${tank.currentFill}L / ${tank.volumenLiter}L` : `${tank.volumenLiter}L`}
                    </div>
                  )}
                  {tank.lastUpdate && (
                    <div className="text-muted-foreground">
                      {new Date(tank.lastUpdate).toLocaleDateString('de-DE')}
                    </div>
                  )}
                  {tank.category && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        tank.category === 'Mazerat' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {tank.category}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredTanks.map((tank) => (
            <Card key={tank.tankId} className="print:break-inside-avoid">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* QR Code */}
                  <div className="w-24 h-24 bg-white rounded-lg p-2 flex-shrink-0">
                    <img 
                      src={tank.qrDataUrl} 
                      alt={`QR Code for ${tank.tankId}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-mono font-bold">{tank.tankId}</h3>
                    {tank.category && (
                      <Badge 
                        variant="outline" 
                        className={
                          tank.category === 'Mazerat' 
                            ? 'bg-blue-50 text-blue-700 mt-1' 
                            : 'bg-green-50 text-green-700 mt-1'
                        }
                      >
                        {tank.category}
                      </Badge>
                    )}
                  </div>

                  {/* Actions - No Print */}
                  <div className="flex gap-2 print:hidden">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Print single QR
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>QR Code - ${tank.tankId}</title>
                                <style>
                                  body { 
                                    display: flex; 
                                    justify-content: center; 
                                    align-items: center; 
                                    height: 100vh; 
                                    margin: 0;
                                    flex-direction: column;
                                  }
                                  h1 { font-family: monospace; margin-bottom: 20px; }
                                  img { max-width: 400px; }
                                </style>
                              </head>
                              <body>
                                <h1>${tank.tankId}</h1>
                                <img src="${tank.qrDataUrl}" />
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredTanks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Keine QR-Codes gefunden</h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? `Keine Tanks gefunden für "${searchQuery}"`
                : 'Keine Tank-Daten verfügbar. Bitte synchronisieren Sie Ihre Tanks.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer - Only Print */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
        <p>MazerationsMeister | QR-Code Album | Seite generiert: {new Date().toLocaleString('de-DE')}</p>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            margin: 1cm;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:grid-cols-4 {
            grid-template-columns: repeat(4, 1fr) !important;
          }
          
          .print\\:gap-3 {
            gap: 0.75rem !important;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
