"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  QrCode, 
  Smartphone, 
  Settings, 
  Download,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

export default function AnleitungenPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('qr-codes');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const downloadPDFGuide = () => {
    // In einer echten Implementierung würde hier eine PDF generiert oder heruntergeladen
    alert('PDF-Download-Funktionalität wird in einer zukünftigen Version verfügbar sein.');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📚 Anleitungen</h1>
        <p className="text-muted-foreground">
          Hier finden Sie detaillierte Anleitungen für alle Funktionen des MazerationsMeisters.
        </p>
      </div>

      {/* Übersicht Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection('qr-codes')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              QR-Code Tankverwaltung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Tanks mit QR-Codes versehen und mobil verwalten.
            </p>
            <Badge variant="secondary">Neu</Badge>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection('onedrive')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              OneDrive-Synchronisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Automatische Datensicherung in der Cloud.
            </p>
            <Badge variant="secondary">Neu</Badge>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection('inventory')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              Inventarverwaltung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Lagerbestände erfassen und verwalten.
            </p>
            <Badge variant="outline">Grundlagen</Badge>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection('mazerations')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Mazerationsverwaltung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Mazerationsprozesse planen und überwachen.
            </p>
            <Badge variant="outline">Grundlagen</Badge>
          </CardContent>
        </Card>
      </div>

      {/* QR-Code Tankverwaltung */}
      <Card className="mb-6">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('qr-codes')}
          >
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-blue-600" />
              📱 QR-Code Tankverwaltung
              <Badge variant="secondary" className="ml-2">Neu</Badge>
            </CardTitle>
            {expandedSection === 'qr-codes' ? 
              <ChevronDown className="h-5 w-5" /> : 
              <ChevronRight className="h-5 w-5" />
            }
          </div>
        </CardHeader>
        {expandedSection === 'qr-codes' && (
          <CardContent className="space-y-6">
            {/* Überblick */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick - QR-Code Tank-Management
              </h3>
              <div className="text-blue-700 text-sm space-y-2">
                <p>
                  Das neue QR-Code-System ermöglicht mobilen Zugriff auf Tank-Informationen direkt vom Smartphone. 
                  <strong> Keine App-Installation erforderlich!</strong>
                </p>
                <div className="bg-white rounded p-3 mt-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>✅ Was funktioniert:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>• QR-Code scannen mit Handy-Kamera</li>
                        <li>• Mobile-optimierte Anzeige</li>
                        <li>• Offline-Fallback-Daten</li>
                        <li>• Netzwerk-übergreifender Zugriff</li>
                      </ul>
                    </div>
                    <div>
                      <strong>📱 Anzeige auf Smartphone:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>🏷️ Sorte (große blaue Karte)</li>
                        <li>📦 Charge (große grüne Karte)</li>
                        <li>📊 Inhalt in Litern (lila Karte)</li>
                        <li>🍾 Alkoholgehalt % vol. (gelbe Karte)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Schritt-für-Schritt */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">🎯 Schritt-für-Schritt Anleitung</h3>
              
              {/* Schritt 1 */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                    Tank-Definitionen erstellen & QR-Codes generieren
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Navigieren Sie zu <strong>Inventar → Tank-Management</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Klicken Sie <strong>"Tanks aus Inventar synchronisieren"</strong> (lädt automatisch erkannte Tanks)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Prüfen Sie Tank-Kapazitäten (Standard: 6000L) und passen Sie diese an</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Aktivieren Sie die Checkboxen für gewünschte Tanks</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Klicken Sie <strong>"QR-Codes generieren"</strong></span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-50 rounded">
                    <strong>💡 Tipp:</strong> Das System erkennt automatisch die Netzwerk-IP (z.B. 192.168.0.7:9003) für Smartphone-Zugriff
                  </div>
                </CardContent>
              </Card>

              {/* Schritt 2 */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                    QR-Codes drucken & anbringen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Klicken Sie <strong>"🖨️ QR-Codes drucken"</strong> für optimierte Druckansicht</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Drucken Sie auf selbstklebende Etiketten (mindestens 4x4 cm empfohlen)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Kleben Sie jeden QR-Code auf den entsprechenden Tank</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span className="text-sm"><strong>Wichtig:</strong> Position gut sichtbar und vor Feuchtigkeit/Verschmutzung geschützt</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-green-50 rounded">
                    <strong>💡 Praxis-Tipp:</strong> QR-Codes enthalten bereits alle wichtigen Daten als Fallback - funktionieren auch offline!
                  </div>
                </CardContent>
              </Card>

              {/* Schritt 3 */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                    QR-Code mit Smartphone scannen
                    <Smartphone className="h-4 w-4 ml-1" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Öffnen Sie die <strong>Kamera-App</strong> oder einen QR-Scanner (iPhone/Android)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Richten Sie die Kamera auf den QR-Code (Abstand: 10-20 cm)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Tippen Sie auf die Benachrichtigung/Link zum Öffnen</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span className="text-sm"><strong>Wichtig:</strong> Smartphone muss im gleichen WLAN sein wie der Computer</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-purple-50 rounded">
                    <strong>📶 Netzwerk:</strong> URL zeigt automatisch auf 192.168.0.7:9003 für lokalen Zugriff
                  </div>
                </CardContent>
              </Card>

              {/* Schritt 4 */}
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                    Mobile Tank-Details ansehen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">📱 Mobile Ansicht zeigt:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>🏷️ <strong>Sorte</strong> in großer blauer Karte</li>
                        <li>📦 <strong>Charge</strong> in großer grüner Karte</li>
                        <li>📊 <strong>Inhalt</strong> (Menge in L) in lila Karte</li>
                        <li>🍾 <strong>Alkoholgehalt</strong> (% vol.) in gelber Karte</li>
                        <li>📏 <strong>Füllstand-Balken</strong> mit Farbkodierung</li>
                        <li>📶 <strong>Online/Offline-Status</strong> oben rechts</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🔄 Funktionen:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>Desktop ↔ Mobile</strong> View-Toggle</li>
                        <li>• <strong>Offline-Modus:</strong> Fallback-Daten aus QR-URL</li>
                        <li>• <strong>Automatische Erkennung:</strong> Smartphone = Mobile View</li>
                        <li>• <strong>Responsive Design:</strong> Optimiert für kleine Bildschirme</li>
                        <li>• <strong>Touch-freundlich:</strong> Große Buttons und Text</li>
                        <li>• <strong>Schnell:</strong> ~200ms Ladezeit (cached)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-orange-50 rounded">
                    <strong>💡 Pro-Tipp:</strong> Bei schlechter Internetverbindung werden automatisch die in der QR-URL gespeicherten Daten angezeigt
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tipps und Troubleshooting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-800">💡 Beste Praktiken</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>🎯 <strong>QR-Position:</strong> In Augenhöhe, gut erreichbar</div>
                  <div>🛡️ <strong>Schutz:</strong> Laminieren oder wetterfeste Etiketten</div>
                  <div>💡 <strong>Beleuchtung:</strong> Ausreichend Licht für gutes Scannen</div>
                  <div>📶 <strong>WLAN:</strong> Stabile Internetverbindung im Lager</div>
                  <div>📏 <strong>Größe:</strong> QR-Code mindestens 4x4 cm drucken</div>
                  <div>🔄 <strong>Backup:</strong> Ersatz-QR-Codes vorrätig halten</div>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-amber-800">🚨 Fehlerbehebung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>📱 <strong>QR nicht erkannt:</strong> Mehr Licht, näher heran, saubere Linse</div>
                  <div>🌐 <strong>Seite lädt nicht:</strong> WLAN-Verbindung prüfen (192.168.0.7)</div>
                  <div>📊 <strong>Leere Daten:</strong> Entwicklungsserver läuft? (Port 9003)</div>
                  <div>🔧 <strong>Nicht speicherbar:</strong> Browser-Cache leeren</div>
                  <div>💾 <strong>Offline-Modus:</strong> Basis-Daten aus QR-URL verfügbar</div>
                  <div>🔄 <strong>QR beschädigt:</strong> Neuen Code generieren & drucken</div>
                </CardContent>
              </Card>
            </div>

            {/* Technische Informationen */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-800">⚙️ Technische Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-semibold mb-1">🌐 Netzwerk-Setup:</h5>
                    <ul className="space-y-1">
                      <li>• <strong>Server:</strong> http://192.168.0.7:9003</li>
                      <li>• <strong>Port:</strong> 9003 (automatisch erkannt)</li>
                      <li>• <strong>Firewall:</strong> Windows Firewall TCP 9003 freigeben</li>
                      <li>• <strong>WLAN:</strong> Beide Geräte im selben Netzwerk</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-1">📱 Kompatibilität:</h5>
                    <ul className="space-y-1">
                      <li>• <strong>iOS:</strong> iPhone Kamera-App (iOS 11+)</li>
                      <li>• <strong>Android:</strong> Google Lens / Kamera</li>
                      <li>• <strong>Browser:</strong> Chrome, Safari, Firefox</li>
                      <li>• <strong>Offline:</strong> Fallback-Daten in QR-URL</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Button für vollständige Anleitung */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">📄 Vollständige Anleitung</h4>
                  <p className="text-sm text-muted-foreground">
                    Laden Sie die detaillierte PDF-Anleitung herunter
                  </p>
                </div>
                <Button variant="outline" className="flex items-center gap-2" onClick={downloadPDFGuide}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* OneDrive-Synchronisation */}
      <Card className="mb-6">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('onedrive')}
          >
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-600" />
              ☁️ OneDrive-Synchronisation
              <Badge variant="secondary" className="ml-2">Automatisch</Badge>
            </CardTitle>
            {expandedSection === 'onedrive' ? 
              <ChevronDown className="h-5 w-5" /> : 
              <ChevronRight className="h-5 w-5" />
            }
          </div>
        </CardHeader>
        {expandedSection === 'onedrive' && (
          <CardContent className="space-y-6">
            {/* Überblick */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                OneDrive-Datensynchronisation
              </h3>
              <div className="text-blue-700 text-sm space-y-2">
                <p>
                  Das System speichert alle wichtigen Daten automatisch in Ihrem OneDrive-Ordner für sichere Cloud-Synchronisation.
                  <strong> Keine Azure-Registrierung erforderlich!</strong>
                </p>
              </div>
            </div>

            {/* Wann werden Daten geschrieben */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">📤 Wann werden Daten in OneDrive geschrieben?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <strong>Sofortige Speicherung (LocalStorage):</strong>
                      <p className="text-sm text-muted-foreground">Alle Eingaben werden automatisch im Browser gespeichert</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <strong>OneDrive-Backup (manuell):</strong>
                      <p className="text-sm text-muted-foreground">Über "📁 Daten speichern" Button in Inventory-Management</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5" />
                    <div>
                      <strong>Automatisches Backup:</strong>
                      <p className="text-sm text-muted-foreground">Alle 10 Tank-Änderungen (konfigurierbar)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div>
                      <strong>Export-Funktionen:</strong>
                      <p className="text-sm text-muted-foreground">XLSX/PDF Exports über entsprechende Buttons</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OneDrive-Ordnerstruktur */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">📂 OneDrive-Ordnerstruktur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm">
                  <div className="text-blue-600">C:\Users\[Username]\OneDrive\MazerationsMeister\</div>
                  <div className="ml-2">├── tanks/</div>
                  <div className="ml-4 text-green-600">│   ├── tank-T341.json        ← Tank-spezifische Daten</div>
                  <div className="ml-4 text-green-600">│   ├── tank-T342.json</div>
                  <div className="ml-4 text-green-600">│   └── tank-T343.json</div>
                  <div className="ml-2">├── chargen/</div>
                  <div className="ml-4 text-purple-600">│   ├── MB-2025-001.json      ← Chargen-Informationen</div>
                  <div className="ml-4 text-purple-600">│   └── MB-2025-002.json</div>
                  <div className="ml-2">├── backup/</div>
                  <div className="ml-4 text-orange-600">│   ├── tank-T341_2025-09-14T10-30-00.json  ← Timestamped Backups</div>
                  <div className="ml-4 text-orange-600">│   └── inventory-backup-2025-09-14.json</div>
                  <div className="ml-2">└── exports/</div>
                  <div className="ml-4 text-red-600">    ├── inventory-export-2025-09-14.xlsx</div>
                  <div className="ml-4 text-red-600">    └── tank-report-2025-09-14.pdf</div>
                </div>
              </CardContent>
            </Card>

            {/* Setup-Anleitung */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">⚙️ OneDrive-Setup in der App</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  <span className="text-sm"><strong>Einstellungen öffnen</strong> → "OneDrive QR-Codes" Tab</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  <span className="text-sm"><strong>OneDrive-Freigabe-URL eingeben</strong> (falls vorhanden für QR-Codes)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                  <span className="text-sm"><strong>App-Pfad festlegen</strong> (optional für erweiterte QR-Code-Features)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                  <span className="text-sm"><strong>"Konfiguration speichern"</strong> klicken</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
                  <span className="text-sm"><strong>"Verbindung testen"</strong> für Funktionsprüfung</span>
                </div>
              </CardContent>
            </Card>

            {/* Backup-Strategien */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-800">✅ Automatische Sicherung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>🔄 <strong>LocalStorage:</strong> Sofortige Speicherung aller Eingaben</div>
                  <div>💾 <strong>OneDrive-Sync:</strong> Automatisch über OneDrive-Client</div>
                  <div>📅 <strong>Tägliche Backups:</strong> Automatische Versionierung</div>
                  <div>🧹 <strong>Aufräumen:</strong> Nur letzten 10 Versionen behalten</div>
                  <div>🔐 <strong>Verschlüsselung:</strong> Durch OneDrive-Service</div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800">📤 Manuelle Exports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>📊 <strong>XLSX-Export:</strong> "Excel-Export" Button in Inventory</div>
                  <div>📄 <strong>PDF-Reports:</strong> Tank-Reports und Protokolle</div>
                  <div>💾 <strong>JSON-Backup:</strong> "📁 Daten speichern" für vollständige Sicherung</div>
                  <div>🔄 <strong>Import:</strong> Wiederherstellung aus JSON-Dateien</div>
                  <div>📁 <strong>Ablageort:</strong> OneDrive/MazerationsMeister/exports/</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Inventarverwaltung */}
      <Card className="mb-6">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('inventory')}
          >
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-green-600" />
              📦 Inventarverwaltung
            </CardTitle>
            {expandedSection === 'inventory' ? 
              <ChevronDown className="h-5 w-5" /> : 
              <ChevronRight className="h-5 w-5" />
            }
          </div>
        </CardHeader>
        {expandedSection === 'inventory' && (
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Grundlegende Funktionen der Inventarverwaltung werden hier erläutert.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm">
                  <strong>Coming Soon:</strong> Detaillierte Anleitung zur Inventarverwaltung wird in Kürze hinzugefügt.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Mazerationsverwaltung */}
      <Card className="mb-6">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('mazerations')}
          >
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-purple-600" />
              🥃 Mazerationsverwaltung
            </CardTitle>
            {expandedSection === 'mazerations' ? 
              <ChevronDown className="h-5 w-5" /> : 
              <ChevronRight className="h-5 w-5" />
            }
          </div>
        </CardHeader>
        {expandedSection === 'mazerations' && (
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Anleitung für die Mazerationsverwaltung und -überwachung.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm">
                  <strong>Coming Soon:</strong> Detaillierte Anleitung zur Mazerationsverwaltung wird in Kürze hinzugefügt.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Footer */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>MazerationsMeister</strong> - Version 1.0
            </p>
            <p>
              Bei Fragen oder Problemen wenden Sie sich an den System-Administrator.
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <Button variant="ghost" size="sm" className="h-auto p-1">
                <ExternalLink className="h-3 w-3 mr-1" />
                Dokumentation
              </Button>
              <Button variant="ghost" size="sm" className="h-auto p-1">
                <ExternalLink className="h-3 w-3 mr-1" />
                Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
