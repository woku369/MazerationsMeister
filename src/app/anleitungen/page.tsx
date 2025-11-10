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
  Info,
  Github,
  Eye,
  EyeOff
} from 'lucide-react';
import { useEffect } from 'react';
import { hybridStorage } from '@/lib/hybrid-storage';

export default function AnleitungenPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('qr-auth');
  const [githubToken, setGithubToken] = useState<string>('');
  const [showToken, setShowToken] = useState(false);

  // GitHub-Token aus hybridStorage laden
  useEffect(() => {
    const loadGitHubToken = async () => {
      try {
        const token = await hybridStorage.get('github-token');
        if (token) {
          setGithubToken(token);
        }
      } catch (error) {
        console.error('Failed to load GitHub token:', error);
      }
    };
    loadGitHubToken();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const downloadPDFGuide = () => {
    // In einer echten Implementierung würde hier eine PDF generiert oder heruntergeladen
    alert('PDF-Download-Funktionalität wird in einer zukünftigen Version verfügbar sein.');
  };

  const handlePrint = () => {
    // Expand all sections before printing
    setExpandedSection('all');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📚 Anleitungen</h1>
            <p className="text-muted-foreground">
              Hier finden Sie detaillierte Anleitungen für alle Funktionen des MazerationsMeisters.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="print:hidden"
          >
            <Download className="h-4 w-4 mr-2" />
            Als PDF drucken
          </Button>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-8">
        <div className="text-center border-b pb-4">
          <h1 className="text-3xl font-bold mb-2">MazerationsMeister</h1>
          <h2 className="text-2xl mb-2">Vollständige Anleitungen</h2>
          <p className="text-sm text-muted-foreground">
            Erstellt am: {new Date().toLocaleDateString('de-DE')} | Version 1.0
          </p>
        </div>
      </div>

      {/* Übersicht Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection('qr-auth')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              QR-Code Sicherheit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              PIN-geschützte QR-Codes für sichere Datenzugriffe.
            </p>
            <Badge variant="secondary">✨ Neu</Badge>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection('qr-codes')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-600" />
              QR-Verwaltung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              QR-Codes generieren, drucken und verwalten.
            </p>
            <Badge variant="outline">Basis</Badge>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection('gebinde')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Gebindeverwaltung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Container befüllen, entleeren und Historie verfolgen.
            </p>
            <Badge variant="secondary">✨ Neu</Badge>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection('mazerations')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-600" />
              Mazerationen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Mazerationsprozesse planen und überwachen.
            </p>
            <Badge variant="outline">Basis</Badge>
          </CardContent>
        </Card>
      </div>

      {/* QR-Code Sicherheit & PIN-Auth */}
      <Card className="mb-6 print:break-inside-avoid">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer print:cursor-default"
            onClick={() => toggleSection('qr-auth')}
          >
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-blue-600" />
              🔐 QR-Code Sicherheit & PIN-Authentifizierung
              <Badge variant="secondary" className="ml-2">✨ Neu</Badge>
            </CardTitle>
            {expandedSection === 'qr-auth' || expandedSection === 'all' ? 
              <ChevronDown className="h-5 w-5 print:hidden" /> : 
              <ChevronRight className="h-5 w-5 print:hidden" />
            }
          </div>
        </CardHeader>
        {(expandedSection === 'qr-auth' || expandedSection === 'all') && (
          <CardContent className="space-y-6">
            {/* Überblick */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick - Geschützte QR-Codes
              </h3>
              <div className="text-blue-700 text-sm space-y-2">
                <p>
                  Alle QR-Codes sind jetzt mit einem <strong>PIN-System</strong> geschützt! 
                  Nur autorisierte Personen können auf die Tankdaten zugreifen.
                </p>
                <div className="bg-white rounded p-3 mt-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>🔐 Sicherheitsmerkmale:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>• PIN-Schutz (5-stellig)</li>
                        <li>• SHA-256 verschlüsselt</li>
                        <li>• Session-basiert</li>
                        <li>• €0 Kosten (GitHub Pages)</li>
                      </ul>
                    </div>
                    <div>
                      <strong>👥 Zwei Zugangsebenen:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>🔑 <strong>Admin:</strong> PIN 00369 (permanent)</li>
                        <li>👤 <strong>Guest:</strong> PIN 78963 (24h)</li>
                        <li>⏱️ Auto-Login nach erstem Scan</li>
                        <li>🔄 Nur 1× pro Tag/Monat einloggen</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wie funktioniert der Login? */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  📱 Erster QR-Scan mit Login
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">QR-Code scannen → <strong>Login-Seite</strong> öffnet sich automatisch</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm"><strong>5-stellige PIN eingeben</strong> (00369 Admin ODER 78963 Guest)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">PIN wird automatisch eingereicht nach 5. Ziffer</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm"><strong>Session-Cookie</strong> wird gespeichert (Admin: permanent, Guest: 24h)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">Automatische Weiterleitung zu den Tank-Daten</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-purple-50 rounded">
                  <strong>💡 Wichtig:</strong> Nach dem ersten Login werden alle weiteren QR-Scans <strong>NICHT mehr nach PIN fragen</strong>!
                </div>
              </CardContent>
            </Card>

            {/* Folge-Scans ohne Login */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  🚀 Alle weiteren Scans (kein Login!)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">QR-Code scannen → <strong>Direkt zu Tankdaten</strong> (ohne Login!)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">Session-Cookie ist noch gültig → <strong>Sofortiger Zugriff</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span className="text-sm">Funktioniert mit <strong>allen 50 Containern</strong> ohne erneuten Login</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <span className="text-sm"><strong>Admin:</strong> Login ~1000 Jahre gültig (praktisch permanent)</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <span className="text-sm"><strong>Guest:</strong> Login 24 Stunden gültig (1× täglich einloggen)</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-green-50 rounded">
                  <strong>🎯 Praxis:</strong> Bei 100+ Scans pro Tag = nur 1× Login! Perfekt für Lager-Alltag.
                </div>
              </CardContent>
            </Card>

            {/* PIN-Codes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800">🔑 Admin-PIN (permanent)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-4xl font-mono font-bold text-blue-600 mb-2">
                      0 0 3 6 9
                    </div>
                    <Badge variant="secondary">Permanent gültig</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>✅ <strong>Unbegrenzte Gültigkeit</strong> (~1000 Jahre)</div>
                    <div>✅ <strong>Für Dauerzugriff</strong> (Geschäftsführer, Betriebsleiter)</div>
                    <div>✅ <strong>Einmal einloggen</strong> = für immer gültig</div>
                    <div>✅ <strong>Alle Container-Daten</strong> zugänglich</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-amber-800">👤 Guest-PIN (24 Stunden)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-4xl font-mono font-bold text-amber-600 mb-2">
                      7 8 9 6 3
                    </div>
                    <Badge variant="outline">24h gültig</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>⏱️ <strong>24 Stunden Gültigkeit</strong></div>
                    <div>⏱️ <strong>Für Temp-Zugriff</strong> (Mitarbeiter, Praktikanten)</div>
                    <div>⏱️ <strong>1× täglich einloggen</strong> reicht aus</div>
                    <div>⏱️ <strong>Automatische Logout</strong> nach 24h</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* GitHub Token Anzeige */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  🔐 GitHub Personal Access Token
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <strong>Aktuell konfigurierter Token:</strong>
                      <p className="text-muted-foreground">Wird für GitHub Pages Sync verwendet (Einstellungen → GitHub-Verbindung)</p>
                    </div>
                  </div>
                  
                  {githubToken ? (
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">Token:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowToken(!showToken)}
                          className="h-6 px-2"
                        >
                          {showToken ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              <span className="text-xs">Verbergen</span>
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              <span className="text-xs">Anzeigen</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="font-mono text-sm break-all bg-gray-100 p-3 rounded">
                        {showToken ? githubToken : '●'.repeat(40)}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div>✅ Format: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</div>
                        <div>✅ Berechtigungen: repo (für GitHub Pages Deployment)</div>
                        <div>🔒 Niemals öffentlich teilen!</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <strong className="text-amber-800">Kein GitHub-Token konfiguriert</strong>
                          <p className="text-amber-700 mt-1">
                            Gehe zu <strong>Einstellungen → GitHub-Verbindung</strong> um einen Token zu erstellen und zu speichern.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sicherheit & Datenschutz */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-800">🛡️ Sicherheit & Datenschutz (DSGVO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <strong>SHA-256 Verschlüsselung:</strong>
                      <p className="text-muted-foreground">PINs werden niemals im Klartext gespeichert, nur als Hash</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <strong>Client-Side Auth:</strong>
                      <p className="text-muted-foreground">Keine Server-Speicherung, alles im Browser (LocalStorage)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <strong>Session-Tokens:</strong>
                      <p className="text-muted-foreground">Base64-kodierte Tokens mit Zeitstempel und Rolle</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <strong>Kein Backend:</strong>
                      <p className="text-muted-foreground">€0 Kosten, keine Datenbank, GitHub Pages kostenlos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <div>
                      <strong>DSGVO-konform:</strong>
                      <p className="text-muted-foreground">Nur autorisierte Personen können auf interne Betriebsdaten zugreifen</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-800">❗ Fehlerbehebung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>❌ PIN wird nicht akzeptiert:</strong> Sicherstellen, dass 5 Ziffern korrekt (00369 oder 78963)</div>
                <div><strong>🔄 Session abgelaufen:</strong> Guest-PIN nach 24h neu eingeben, Admin sollte permanent sein</div>
                <div><strong>📱 Login-Loop:</strong> Browser-Cache löschen (Einstellungen → Verlauf löschen)</div>
                <div><strong>🌐 Seite lädt nicht:</strong> WLAN-Verbindung prüfen (selbes Netzwerk wie PC)</div>
                <div><strong>💾 LocalStorage voll:</strong> Alte Sessions manuell löschen (Browser-DevTools)</div>
                <div><strong>🔐 PIN vergessen:</strong> Kontakt zum System-Administrator (PINs in auth-config.js hardcoded)</div>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>

      {/* QR-Code Tankverwaltung */}
      <Card className="mb-6 print:break-inside-avoid">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer print:cursor-default"
            onClick={() => toggleSection('qr-codes')}
          >
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-blue-600" />
              📱 QR-Code Tankverwaltung
              <Badge variant="secondary" className="ml-2">Neu</Badge>
            </CardTitle>
            {expandedSection === 'qr-codes' || expandedSection === 'all' ? 
              <ChevronDown className="h-5 w-5 print:hidden" /> : 
              <ChevronRight className="h-5 w-5 print:hidden" />
            }
          </div>
        </CardHeader>
        {(expandedSection === 'qr-codes' || expandedSection === 'all') && (
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
      <Card className="mb-6 print:break-inside-avoid">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer print:cursor-default"
            onClick={() => toggleSection('onedrive')}
          >
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-600" />
              ☁️ Datenspeicherung (OneDrive optional)
            </CardTitle>
            {expandedSection === 'onedrive' || expandedSection === 'all' ? 
              <ChevronDown className="h-5 w-5 print:hidden" /> : 
              <ChevronRight className="h-5 w-5 print:hidden" />
            }
          </div>
        </CardHeader>
        {(expandedSection === 'onedrive' || expandedSection === 'all') && (
          <CardContent className="space-y-6">
            {/* Überblick */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                📁 Automatische Datenspeicherung
              </h3>
              <p className="text-blue-700 text-sm">
                Alle Daten werden automatisch im Browser (LocalStorage) gespeichert. 
                Optional können Sie OneDrive für Cloud-Backup aktivieren.
              </p>
            </div>

            {/* Standard-Speicherung */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">� Standard: Browser-Speicherung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>Automatisch:</strong> Alle Eingaben werden sofort gespeichert
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>Lokal:</strong> Daten bleiben auf Ihrem Computer
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>Schnell:</strong> Keine Internet-Verbindung nötig
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>Sicher:</strong> Keine Cloud-Uploads ohne Ihre Zustimmung
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OneDrive Optional */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">☁️ Optional: OneDrive-Backup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Für zusätzliche Sicherheit können Sie OneDrive-Synchronisation aktivieren:
                </p>
                <div className="space-y-2 text-sm">
                  <div>1️⃣ <strong>Einstellungen</strong> → "OneDrive QR-Codes" Tab öffnen</div>
                  <div>2️⃣ <strong>OneDrive-Ordner</strong> auswählen (z.B. C:\Users\[Name]\OneDrive\MazerationsMeister)</div>
                  <div>3️⃣ <strong>"Synchronisation aktivieren"</strong> klicken</div>
                  <div>4️⃣ <strong>Automatisches Backup</strong> bei jeder Änderung</div>
                </div>
                <div className="bg-blue-50 rounded p-2 text-xs">
                  💡 <strong>Hinweis:</strong> OneDrive ist optional - die App funktioniert auch ohne!
                </div>
              </CardContent>
            </Card>

            {/* Export-Funktionen */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">📤 Manuelle Exports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>📊 <strong>Excel-Export:</strong> "Excel-Export" Button in Inventar-Ansicht</div>
                <div>📄 <strong>PDF-Reports:</strong> Tank-Reports direkt aus Tank-Ansicht</div>
                <div>💾 <strong>JSON-Backup:</strong> Vollständige Datensicherung über "Daten exportieren"</div>
                <div>🔄 <strong>Import:</strong> Backup-Dateien wieder einlesen</div>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>

      {/* Gebindeverwaltung */}
      <Card className="mb-6 print:break-inside-avoid">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer print:cursor-default"
            onClick={() => toggleSection('gebinde')}
          >
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-purple-600" />
              🫙 Gebindeverwaltung
              <Badge variant="secondary" className="ml-2">✨ Neu</Badge>
            </CardTitle>
            {expandedSection === 'gebinde' || expandedSection === 'all' ? 
              <ChevronDown className="h-5 w-5 print:hidden" /> : 
              <ChevronRight className="h-5 w-5 print:hidden" />
            }
          </div>
        </CardHeader>
        {(expandedSection === 'gebinde' || expandedSection === 'all') && (
          <CardContent className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2">
                🫙 Container-Management
              </h3>
              <p className="text-purple-700 text-sm">
                Verwalten Sie Ihre Gebinde effizient: Befüllen, Entleeren, Historie verfolgen.
              </p>
            </div>

            {/* Grundfunktionen */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">✨ Hauptfunktionen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>📥 Befüllen:</strong> Container mit Charge befüllen (Menge, Datum, Quelle)
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>📤 Entleeren:</strong> Container teilweise oder komplett leeren
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>🔄 Reset:</strong> Container auf Leer zurücksetzen
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>📜 Historie:</strong> Alle Befüll- und Entleer-Vorgänge nachvollziehen
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <strong>📊 Kategorien:</strong> Mazerat oder Destillat automatisch erkannt
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schritt-für-Schritt */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">📝 Anleitung: Container befüllen</h3>
              
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div>1️⃣ Navigiere zu <strong>Gebindeverwaltung</strong> im Hauptmenü</div>
                  <div>2️⃣ Suche den Container in der Liste (z.B. "T 341")</div>
                  <div>3️⃣ Klicke <strong>"Befüllen"</strong> Button</div>
                  <div>4️⃣ Wähle <strong>Charge</strong> aus Dropdown (z.B. "MB-2025-001")</div>
                  <div>5️⃣ Gib <strong>Menge in Liter</strong> ein</div>
                  <div>6️⃣ <strong>Datum</strong> wird automatisch gesetzt (anpassbar)</div>
                  <div>7️⃣ Optional: <strong>Quelle/Notiz</strong> hinzufügen</div>
                  <div>8️⃣ Klicke <strong>"Befüllen"</strong> → Fertig! ✅</div>
                </CardContent>
              </Card>
            </div>

            {/* QR-Integration */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">� Integration mit QR-Codes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <QrCode className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <strong>Mobiler Zugriff:</strong> QR-Code scannen → Container-Daten sehen
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <QrCode className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <strong>Echtzeit-Updates:</strong> Befüllung sofort auf Smartphone sichtbar
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <QrCode className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <strong>Batch-Druck:</strong> QR-Codes für alle Container auf einmal drucken
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>

      {/* Inventarverwaltung - Entfernt */}

      {/* Mazerationsverwaltung */}
      <Card className="mb-6 print:break-inside-avoid">
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer print:cursor-default"
            onClick={() => toggleSection('mazerations')}
          >
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-purple-600" />
              🥃 Mazerationsverwaltung
            </CardTitle>
            {expandedSection === 'mazerations' || expandedSection === 'all' ? 
              <ChevronDown className="h-5 w-5 print:hidden" /> : 
              <ChevronRight className="h-5 w-5 print:hidden" />
            }
          </div>
        </CardHeader>
        {(expandedSection === 'mazerations' || expandedSection === 'all') && (
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
      <Card className="bg-muted/50 print:hidden">
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

      {/* Print Footer - Only visible when printing */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm">
        <p className="text-muted-foreground">
          <strong>MazerationsMeister</strong> | Vollständige Anleitungen | Version 1.0
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          © 2025 | Erstellt am: {new Date().toLocaleDateString('de-DE')}
        </p>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            margin: 2cm;
            size: A4;
          }
          
          /* Hide interactive elements */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Show print-only elements */
          .print\\:block {
            display: block !important;
          }
          
          /* Prevent page breaks inside cards */
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Hide cursor pointer in print */
          .print\\:cursor-default {
            cursor: default !important;
          }
          
          /* Ensure all sections are expanded */
          [data-state="closed"] {
            display: block !important;
          }
          
          /* Remove shadows for better print quality */
          .shadow,
          .shadow-sm,
          .shadow-md,
          .shadow-lg {
            box-shadow: none !important;
          }
          
          /* Better contrast for print */
          .text-muted-foreground {
            color: #666 !important;
          }
          
          /* Remove hover effects */
          .hover\\:bg-muted\\/50:hover {
            background-color: transparent !important;
          }
          
          /* Ensure badges are visible */
          .bg-blue-50,
          .bg-green-50,
          .bg-purple-50,
          .bg-amber-50,
          .bg-red-50,
          .bg-orange-50,
          .bg-yellow-50 {
            border: 1px solid #ddd !important;
          }
        }
      `}</style>
    </div>
  );
}
