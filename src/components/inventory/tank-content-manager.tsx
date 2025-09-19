"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import type { StoredInventoryItem } from '@/schemas/inventorySchema';
import type { TankDefinition } from '@/schemas/tankSchema';

// Echte Tank-Inhalte basierend auf dem Inventarsystem
interface RealTankContent {
  tankNr: string;
  tankDefinition?: TankDefinition;
  inventoryItems: StoredInventoryItem[];
  totalVolume: number;
  totalAlcohol: number; // Liter Absolutalkohol
  averageAlcoholPercent: number;
}

export default function TankContentManager() {
  const [tankContents, setTankContents] = useState<RealTankContent[]>([]);
  const [selectedTankNr, setSelectedTankNr] = useState<string>('');
  const [qrCodes, setQrCodes] = useState<{[tankNr: string]: string}>({});

  // Echte Daten aus Inventar und Tank-Definitionen laden
  useEffect(() => {
    loadRealTankContents();
  }, []);

  const loadRealTankContents = () => {
    if (typeof window === 'undefined') return;

    try {
      // Echte Inventardaten laden
      const inventoryData = localStorage.getItem('inventoryItems');
      const tankDefinitionsData = localStorage.getItem('tankDefinitions');
      
      if (!inventoryData) {
        console.log('Keine Inventardaten gefunden');
        setTankContents([]);
        return;
      }

      const inventoryItems: StoredInventoryItem[] = JSON.parse(inventoryData);
      const tankDefinitions: TankDefinition[] = tankDefinitionsData ? JSON.parse(tankDefinitionsData) : [];
      
      console.log('📊 Geladene Inventardaten:', inventoryItems.length, 'Items');
      console.log('🏭 Tank-Definitionen:', tankDefinitions.length, 'Tanks');

      // Gruppiere Inventar-Items nach Tank-Nummer
      const tankGroups = new Map<string, StoredInventoryItem[]>();
      
      inventoryItems.forEach(item => {
        if (item.tankNr && item.currentQuantityLiters > 0) {
          if (!tankGroups.has(item.tankNr)) {
            tankGroups.set(item.tankNr, []);
          }
          tankGroups.get(item.tankNr)!.push(item);
        }
      });

      console.log('🗂️ Tank-Gruppen:', Array.from(tankGroups.keys()));

      // Konvertiere zu RealTankContent
      const realContents: RealTankContent[] = Array.from(tankGroups.entries()).map(([tankNr, items]) => {
        const tankDef = tankDefinitions.find(t => t.tankNr === tankNr);
        
        const totalVolume = items.reduce((sum, item) => sum + item.currentQuantityLiters, 0);
        const totalAlcohol = items.reduce((sum, item) => 
          sum + (item.currentQuantityLiters * item.alcoholVolProzent / 100), 0
        );
        const averageAlcoholPercent = totalVolume > 0 ? (totalAlcohol / totalVolume) * 100 : 0;

        return {
          tankNr,
          tankDefinition: tankDef,
          inventoryItems: items,
          totalVolume,
          totalAlcohol,
          averageAlcoholPercent
        };
      });

      console.log('✅ Echte Tank-Inhalte generiert:', realContents.length, 'Tanks mit Inhalt');
      realContents.forEach(content => {
        console.log(`Tank ${content.tankNr}: ${content.totalVolume}L, ${content.averageAlcoholPercent.toFixed(1)}%, ${content.inventoryItems.length} Items`);
      });

      setTankContents(realContents);
      
      // Ersten Tank auswählen wenn vorhanden
      if (realContents.length > 0 && !selectedTankNr) {
        setSelectedTankNr(realContents[0].tankNr);
      }
      
    } catch (error) {
      console.error('Fehler beim Laden der echten Tank-Daten:', error);
      setTankContents([]);
    }
  };

  const getCurrentTankContent = (): RealTankContent | undefined => {
    return tankContents.find(content => content.tankNr === selectedTankNr);
  };

  const generateQRCode = async (tankContent: RealTankContent) => {
    try {
      // Importiere Cloud-QR-Generator
      const cloudQRGenerator = await import('@/lib/cloud-qr-generator');
      
      const tankInfo = {
        tankNr: tankContent.tankNr,
        bezeichnung: tankContent.tankDefinition?.bezeichnung || 'Unbekannt',
        volumen: tankContent.tankDefinition?.volumenLiter || 0
      };
      
      // Generiere Cloud-QR-Code mit OneDrive Integration
      let qrData: string;
      try {
        qrData = await cloudQRGenerator.generateCloudQRUrl(tankContent.tankNr, tankInfo);
      } catch (error) {
        console.warn('Cloud-QR-Code fehlgeschlagen, verwende lokale URL:', error);
        qrData = cloudQRGenerator.generateLocalFallbackUrl(tankContent.tankNr, tankInfo);
      }
      
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodes(prev => ({
        ...prev,
        [tankContent.tankNr]: qrDataUrl
      }));
    } catch (error) {
      console.error('QR-Code Fehler:', error);
    }
  };

  const saveToInventory = async () => {
    // Die Daten sind bereits im echten Inventar gespeichert
    try {
      alert('✅ Tank-Daten sind bereits im Inventarsystem gespeichert!');
    } catch (error) {
      alert('❌ Fehler: ' + error);
    }
  };

  const currentTankContent = getCurrentTankContent();
  const fuellstandProzent = currentTankContent && currentTankContent.tankDefinition 
    ? Math.round((currentTankContent.totalVolume / currentTankContent.tankDefinition.volumenLiter) * 100) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🏭 Tank-Inhalte Verwalten (Echte Daten)
            <div className="flex gap-2">
              <Button onClick={loadRealTankContents} variant="outline" className="flex items-center gap-2">
                🔄 Aktualisieren
              </Button>
              <Button onClick={saveToInventory} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Daten im Inventar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tank-Auswahl */}
          <div className="mb-6">
            <Label>Tank auswählen (aus echtem Inventar):</Label>
            {tankContents.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-2">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Keine Tanks mit Inhalt gefunden</strong>
                </p>
                <p className="text-xs text-yellow-700">
                  Gehen Sie zu "Inventar", um Lagerartikel mit Tank-Nummern anzulegen.
                  Nur Tanks mit aktuellem Bestand &gt; 0 werden hier angezeigt.
                </p>
              </div>
            ) : (
              <div className="flex gap-2 mt-2 flex-wrap">
                {tankContents.map(content => (
                  <Button
                    key={content.tankNr}
                    variant={selectedTankNr === content.tankNr ? "default" : "outline"}
                    onClick={() => setSelectedTankNr(content.tankNr)}
                    className="flex flex-col items-center p-3 h-auto"
                  >
                    <span className="font-bold">{content.tankNr}</span>
                    <span className="text-xs opacity-70">
                      {content.totalVolume.toLocaleString()}L
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {currentTankContent && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tank-Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Tank {currentTankContent.tankNr}
                    <Button
                      size="sm"
                      onClick={() => generateQRCode(currentTankContent)}
                      className="flex items-center gap-1"
                    >
                      <QrCode className="h-4 w-4" />
                      QR
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Kapazität</p>
                        <p className="text-xl font-bold">
                          {currentTankContent.tankDefinition?.volumenLiter?.toLocaleString() || 'Unbekannt'} L
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Aktueller Füllstand</p>
                        <p className="text-xl font-bold text-blue-600">
                          {currentTankContent.totalVolume.toLocaleString()} L
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ø Alkoholgehalt</p>
                        <p className="text-xl font-bold text-green-600">
                          {currentTankContent.averageAlcoholPercent.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Liter Absolutalkohol</p>
                        <p className="text-xl font-bold text-purple-600">
                          {currentTankContent.totalAlcohol.toLocaleString()} LA
                        </p>
                      </div>
                    </div>

                    {/* Füllstand-Balken */}
                    {currentTankContent.tankDefinition && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Füllstand</span>
                          <span>{fuellstandProzent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full transition-all ${
                              fuellstandProzent > 90 ? 'bg-red-500' :
                              fuellstandProzent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(fuellstandProzent, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* QR-Code Anzeige */}
                    {qrCodes[currentTankContent.tankNr] && (
                      <div className="text-center">
                        <img 
                          src={qrCodes[currentTankContent.tankNr]} 
                          alt={`QR Code für Tank ${currentTankContent.tankNr}`}
                          className="mx-auto border rounded"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          QR-Code für Tank {currentTankContent.tankNr}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Hinweis zur Verwaltung */}
              <Card>
                <CardHeader>
                  <CardTitle>🔄 Bestandsverwaltung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">Echte Inventardaten</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Diese Anzeige basiert auf den echten Inventardaten. 
                        Änderungen nehmen Sie im Hauptmenü unter "Inventar" vor.
                      </p>
                      <Button 
                        onClick={() => window.location.href = '/inventory'}
                        className="bg-blue-600 hover:bg-blue-700 w-full"
                      >
                        📊 Zum Inventar-Management
                      </Button>
                    </div>

                    {currentTankContent.inventoryItems.length > 1 && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Mehrere Chargen</h4>
                        <p className="text-sm text-yellow-700">
                          Dieser Tank enthält {currentTankContent.inventoryItems.length} verschiedene Chargen.
                          Die Anzeige zeigt die Gesamtwerte aller Chargen.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Aktuelle Lagerartikel im Tank */}
          {currentTankContent && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>📦 Aktuelle Lagerartikel in Tank {currentTankContent.tankNr}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentTankContent.inventoryItems.length === 0 ? (
                  <div className="bg-blue-50 border border-blue-200 p-8 rounded-lg text-center">
                    <div className="text-blue-600 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Tank ist leer</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Dieser Tank enthält derzeit keine Lagerartikel mit positivem Bestand.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentTankContent.inventoryItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded bg-white">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{item.artikelNummer}</Badge>
                            <Badge variant="secondary">{item.category}</Badge>
                            {item.chargenNummer && (
                              <Badge variant="outline">Charge: {item.chargenNummer}</Badge>
                            )}
                          </div>
                          <p className="font-semibold">{item.produktName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.currentQuantityLiters.toLocaleString()} L • {item.alcoholVolProzent}% • 
                            {((item.currentQuantityLiters * item.alcoholVolProzent) / 100).toFixed(1)} LA • 
                            Inventur: {new Date(item.lastInventoryDate).toLocaleDateString()}
                          </p>
                          {item.bemerkungen && (
                            <p className="text-xs text-gray-600 mt-1">💬 {item.bemerkungen}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {item.currentQuantityLiters.toLocaleString()} L
                          </div>
                          <div className="text-sm text-gray-600">
                            {item.alcoholVolProzent}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
