'use client';

import { Card } from '@/components/ui/card';
import { FileText, Download, Eye, Trash2, FolderOpen, FileSpreadsheet, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Dokumentenverwaltung - Zentrale Übersicht aller exportierten Dokumente
 * 
 * Status: Platzhalter für zukünftige Implementation
 * 
 * Geplante Features:
 * Liste aller exportierten Dokumente (PDF, Excel, CSV)
 * Filter nach Typ (Reichweite, Protokoll, Rezeptur, QR-Codes)
 * Vorschau-Funktion, Download und Löschen
 * Versionierung, Tags und Notizen
 * 
 * Siehe: docs/DOKUMENTENVERWALTUNG.md
 */
export default function DokumentePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📁 Dokumentenverwaltung</h1>
        <p className="text-muted-foreground">
          Zentrale Verwaltung aller exportierten Dokumente und Berichte
        </p>
      </div>

      {/* Platzhalter-Inhalte */}
      <div className="grid gap-6">
        {/* Info-Card */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Feature in Planung
              </h2>
              <p className="text-blue-800 mb-4">
                Die Dokumentenverwaltung befindet sich aktuell in der Planungsphase. 
                Hier werden Sie zukünftig alle exportierten Dokumente aus verschiedenen 
                Bereichen der Anwendung zentral verwalten können.
              </p>
              <div className="space-y-2 text-sm text-blue-700">
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Reichweitenanalysen (PDF, Excel, CSV)
                </p>
                <p className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Produktionsprotokolle
                </p>
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Rezepturdokumente
                </p>
                <p className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  QR-Code-Sammlungen
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Geplante Features */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Geplante Funktionen</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Dokumentenübersicht
              </h3>
              <p className="text-sm text-muted-foreground">
                Liste aller Dokumente mit Filtermöglichkeiten nach Typ, Datum und Status
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" />
                Export & Download
              </h3>
              <p className="text-sm text-muted-foreground">
                Einzelexport oder Batch-Download mehrerer Dokumente als ZIP
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Versionierung
              </h3>
              <p className="text-sm text-muted-foreground">
                Mehrere Versionen eines Dokuments mit Änderungsprotokoll
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Verwaltung
              </h3>
              <p className="text-sm text-muted-foreground">
                Umbenennen, Löschen, Archivieren und Tagging von Dokumenten
              </p>
            </div>
          </div>
        </Card>

        {/* Dokumentation */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Dokumentation</h2>
          <p className="text-muted-foreground mb-4">
            Detaillierte Informationen zur geplanten Dokumentenverwaltung finden Sie in der 
            technischen Dokumentation.
          </p>
          <Button variant="outline" asChild>
            <a 
              href="/docs/DOKUMENTENVERWALTUNG.md" 
              target="_blank"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Dokumentation öffnen
            </a>
          </Button>
        </Card>

        {/* Temporäre Alternative */}
        <Card className="p-6 bg-amber-50 border-amber-200">
          <h2 className="text-xl font-semibold mb-4 text-amber-900">
            Zwischenlösung
          </h2>
          <p className="text-amber-800 mb-4">
            Bis zur Implementation der Dokumentenverwaltung können Sie exportierte 
            Dokumente über Ihr Betriebssystem verwalten:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-amber-700">
            <li>Reichweitenanalysen: Werden direkt heruntergeladen (Downloads-Ordner)</li>
            <li>Produktionsprotokolle: Siehe Mazerationen → PDF-Export</li>
            <li>Rezepturen: Siehe Rezepturen → Druck-Funktion</li>
            <li>QR-Codes: Siehe QR-Code Album → Batch-Druck</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
