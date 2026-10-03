"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  QrCode,
  Smartphone,
  Settings,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  Warehouse,
  Beaker,
  Truck,
  FlaskConical,
  TableProperties,
  Github,
  PackageCheck,
  Droplets,
  Send,
} from 'lucide-react';

type SectionId =
  | 'mazerationen'
  | 'sammelliste'
  | 'lagerverwaltung'
  | 'einlagerung'
  | 'rezepturen'
  | 'lohnbrand'
  | 'versand'
  | 'qr-codes'
  | 'github'
  | 'onedrive';

interface OverviewEntry {
  id: SectionId;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

const overview: OverviewEntry[] = [
  {
    id: 'mazerationen',
    icon: <FlaskConical className="h-5 w-5 text-purple-600" />,
    title: 'Mazerationen',
    description: 'Protokoll erfassen, Reinalkohol-Bilanz, Einbuchung ins Lager.',
    badge: 'Grundlagen',
  },
  {
    id: 'sammelliste',
    icon: <TableProperties className="h-5 w-5 text-purple-600" />,
    title: 'Sammelliste',
    description: 'Mehrere Protokolle als Übersichtstabelle + XLSX exportieren.',
    badge: 'Grundlagen',
  },
  {
    id: 'lagerverwaltung',
    icon: <Warehouse className="h-5 w-5 text-green-600" />,
    title: 'Lagerverwaltung',
    description: 'Artikelstamm, Zugang/Abgang buchen, XLSX-Import/Export.',
    badge: 'Grundlagen',
  },
  {
    id: 'einlagerung',
    icon: <Droplets className="h-5 w-5 text-cyan-600" />,
    title: 'Einlagern',
    description: 'Neue Menge direkt in einen oder mehrere Tanks einbuchen.',
    badge: 'Neu',
  },
  {
    id: 'rezepturen',
    icon: <Beaker className="h-5 w-5 text-pink-600" />,
    title: 'Rezepturen (GFKC)',
    description: 'Verschnitt ausmischen, Alkoholkorrektur, Produzieren & Buchen.',
    badge: 'Neu',
  },
  {
    id: 'lohnbrand',
    icon: <Truck className="h-5 w-5 text-orange-600" />,
    title: 'Lohnbrand-Aufträge',
    description: 'Mazerat zum Lohnbrenner, Rücklauf des Destillats verbuchen.',
    badge: 'Neu',
  },
  {
    id: 'versand',
    icon: <Send className="h-5 w-5 text-indigo-600" />,
    title: 'Versand an Lohnabfüller',
    description: 'Fertige Ware versenden, Abgang buchen, Lieferschein-Hilfsdaten.',
    badge: 'Neu',
  },
  {
    id: 'qr-codes',
    icon: <QrCode className="h-5 w-5 text-blue-600" />,
    title: 'QR-Code Tankverwaltung',
    description: 'Tanks mit QR-Codes versehen und mobil per Smartphone abrufen.',
  },
  {
    id: 'github',
    icon: <Github className="h-5 w-5 text-slate-700" />,
    title: 'GitHub-Integration',
    description: 'Voraussetzung für QR-Codes von unterwegs und Auto-Sync.',
  },
  {
    id: 'onedrive',
    icon: <Settings className="h-5 w-5 text-blue-600" />,
    title: 'OneDrive-Synchronisation',
    description: 'Manuelle Backups und Exporte in die Cloud.',
  },
];

function StepCard({
  number,
  color,
  title,
  icon,
  children,
}: {
  number: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    blue: 'border-l-blue-500 bg-blue-500',
    green: 'border-l-green-500 bg-green-500',
    purple: 'border-l-purple-500 bg-purple-500',
    orange: 'border-l-orange-500 bg-orange-500',
    pink: 'border-l-pink-500 bg-pink-500',
  };
  const [border, bg] = colorMap[color].split(' ');
  return (
    <Card className={`border-l-4 ${border}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className={`${bg} text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0`}>{number}</span>
          {title}
          {icon}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
      <span className="text-sm">{children}</span>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <span className="text-sm">{children}</span>
    </div>
  );
}

const TIP_BG: Record<string, string> = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  purple: 'bg-purple-50',
  orange: 'bg-orange-50',
  pink: 'bg-pink-50',
};

function Tip({ color, children }: { color: keyof typeof TIP_BG; children: React.ReactNode }) {
  return (
    <div className={`text-xs text-muted-foreground mt-2 p-2 ${TIP_BG[color]} rounded`}>{children}</div>
  );
}

export default function AnleitungenPage() {
  const [expandedSection, setExpandedSection] = useState<SectionId | null>('mazerationen');

  const toggleSection = (section: SectionId) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionHeader = ({
    id,
    icon,
    title,
    badge,
  }: {
    id: SectionId;
    icon: React.ReactNode;
    title: string;
    badge?: string;
  }) => (
    <CardHeader>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection(id)}>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          {badge && <Badge variant="secondary" className="ml-2">{badge}</Badge>}
        </CardTitle>
        {expandedSection === id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </div>
    </CardHeader>
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📚 Anleitungen</h1>
        <p className="text-muted-foreground">
          Anleitungen für alle Module des MazerationsMeisters — Mazeration, Lagerverwaltung, Rezepturen/GFKC,
          Lohnbrand und die technische Konfiguration.
        </p>
      </div>

      {/* Übersicht Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {overview.map(o => (
          <Card key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSection(o.id)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {o.icon}
                {o.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{o.description}</p>
              {o.badge && <Badge variant={o.badge === 'Neu' ? 'secondary' : 'outline'}>{o.badge}</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mazerationen */}
      <Card className="mb-6">
        <SectionHeader id="mazerationen" icon={<FlaskConical className="h-6 w-6 text-purple-600" />} title="🥃 Mazerationen" />
        {expandedSection === 'mazerationen' && (
          <CardContent className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <div className="text-purple-700 text-sm space-y-2">
                <p>
                  Jede Mazeration — ob <strong>Großmazeration</strong> (Kisten-/Litermengen, buchungs- und
                  zollrelevant) oder <strong>kleine Versuchsmazeration</strong> (Testmaßstab, nicht buchungsrelevant)
                  — wird über das Mazerationsformular unter <strong>Mazerationen</strong> protokolliert. Der
                  Unterschied wird bewusst rein manuell gehandhabt: Bei kleinen Versuchen bleibt das Feld
                  „Zieltank" einfach leer.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">🎯 Formular-Aufbau</h3>

              <StepCard number={1} color="purple" title="Basisdaten & Pflanzeninformationen">
                <Check>Bezeichnung, Chargennummer und Ansatzdatum erfassen</Check>
                <Check>Pflanzenmaterial, Menge (kg) und Herkunft eintragen</Check>
              </StepCard>

              <StepCard number={2} color="blue" title="Alkoholinformationen">
                <Check>Eingesetzten Sprit (Menge in Litern, Alkoholgehalt %vol.) erfassen</Check>
                <Check>Nach Mazerationsende: Ausbeute-Menge und Endalkohol eintragen</Check>
                <Tip color="blue">
                  Alternativ Ausbeute aus <strong>Masse (kg) + Dichte</strong> berechnen lassen — Volumen wird dann
                  automatisch ermittelt.
                </Tip>
              </StepCard>

              <StepCard number={3} color="green" title="Reinalkohol-Bilanz (LA) — live sichtbar">
                <Check>
                  <strong>Eingesetzte LA</strong>, <strong>Ausbeute LA</strong> und <strong>Verlust LA</strong>{' '}
                  werden automatisch aus Menge × Alkoholgehalt berechnet und direkt im Formular angezeigt
                </Check>
                <Check>Verlust LA entspricht dem Restalkohol, der im Pflanzenmaterial zurückbleibt</Check>
                <Warn>
                  Der Verlust muss im Gesamt-LA-Bestand nachvollziehbar bleiben — deshalb wird er nicht nur im
                  PDF/XLSX-Export, sondern schon während der Eingabe angezeigt.
                </Warn>
              </StepCard>

              <StepCard number={4} color="orange" title="Zeitaufzeichnung, Ergebnis & Zieltank">
                <Check>Arbeitszeiten je Prozessschritt eintragen (Verarbeitung, Reinigung, Sonstiges)</Check>
                <Check>
                  <strong>Zieltank</strong> auswählen, wenn das Mazerat direkt eingelagert werden soll — nur echte,
                  bereits angelegte Tanks stehen zur Auswahl (plus „Kein Zieltank" zum Überspringen)
                </Check>
                <Check>
                  Beim Speichern mit Zieltank + Ausbeute erscheint ein Bestätigungsdialog, bevor der Lagerzugang
                  tatsächlich gebucht wird — nichts passiert automatisch im Hintergrund
                </Check>
              </StepCard>

              <StepCard number={5} color="pink" title="Speichern & Export">
                <Check>
                  <strong>„Protokoll Exportieren &amp; Log Aktualisieren"</strong> erzeugt PDF/DOCX/XLSX und trägt
                  die Charge in die fortlaufende Chargen-Liste ein
                </Check>
                <Check>
                  <strong>„Leeres Protokoll Exportieren"</strong> für einen unausgefüllten Vordruck (z.B. zum
                  handschriftlichen Erfassen im Mazerationsraum)
                </Check>
                <Check>
                  <strong>„Aus GitHub laden"</strong> importiert Protokolle, die über die Mazeration-PWA am
                  Tablet/Smartphone vor Ort erfasst und synchronisiert wurden
                </Check>
              </StepCard>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sammelliste */}
      <Card className="mb-6">
        <SectionHeader id="sammelliste" icon={<TableProperties className="h-6 w-6 text-purple-600" />} title="📋 Sammelliste" />
        {expandedSection === 'sammelliste' && (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Unter <strong>Mazerationen → Sammelliste</strong> lassen sich mehrere gespeicherte Protokolle
              auswählen und als gemeinsame Übersichtstabelle mit Kraut, Sprit, LA-Einsatz, Mazerat-Menge,
              Endalkohol, <strong>LA-Ausbeute</strong> und <strong>LA-Verlust</strong> anzeigen — inklusive
              Summenzeile über den gewählten Zeitraum.
            </p>
            <div className="space-y-1">
              <Check>Protokolle in der linken Spalte per Checkbox auswählen</Check>
              <Check>Rechts erscheint sofort die Übersichtstabelle mit allen LA-Kennzahlen</Check>
              <Check>„XLSX" exportiert die aktuelle Auswahl als Excel-Datei mit Summenzeile</Check>
            </div>
            <Tip color="purple">
              Damit lässt sich der kumulierte Reinalkohol-Verlust über einen beliebigen Zeitraum nachvollziehen,
              nicht nur pro Einzelcharge.
            </Tip>
          </CardContent>
        )}
      </Card>

      {/* Lagerverwaltung */}
      <Card className="mb-6">
        <SectionHeader id="lagerverwaltung" icon={<Warehouse className="h-6 w-6 text-green-600" />} title="📦 Lagerverwaltung" />
        {expandedSection === 'lagerverwaltung' && (
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <p className="text-green-700 text-sm">
                Die Lagerverwaltung führt Artikelstamm (welche Produkte es gibt) und tatsächlichen Lagerbestand
                (was aktuell in welchem Tank/Gebinde liegt, inkl. Menge und Alkoholgehalt) zusammen. Jede
                Bestandsänderung läuft über eine gebuchte Zugang- oder Abgang-Transaktion — der Bestand wird nie
                still überschrieben.
              </p>
              <p className="text-green-700 text-sm mt-2">
                Die Seite ist in drei Tabs gegliedert: <strong>Lagerbestand</strong> (öffnet sich standardmäßig, da
                am häufigsten gebraucht), <strong>Buchungsjournal</strong> und <strong>Artikelstamm</strong> — letzterer
                steht bewusst hinten, da Produkte meist nur einmalig angelegt werden.
              </p>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="green" title="Artikelstamm anlegen oder importieren">
                <Check>Im Tab <strong>Artikelstamm</strong>: neue Artikel manuell anlegen oder als XLSX importieren (Artikelnummer, Produktname erforderlich)</Check>
                <Check>Kategorie je Artikel nachträglich zuordnen (z.B. Mazerat, Destillat, Sprit, GFKC)</Check>
              </StepCard>

              <StepCard number={2} color="blue" title="Lagerbestand erfassen oder importieren">
                <Check>Im Tab <strong>Lagerbestand</strong>: einzeln über „Neue Charge/Bestand anlegen" mit Chargennummer, Tanknummer, Menge und Alkoholgehalt anlegen</Check>
                <Check>Oder als XLSX-Bestandsliste importieren (Chargennummer + Menge erforderlich) — der Import-Bereich oberhalb der Tabs funktioniert für Artikelstamm- und Lagerbestand-Dateien gleichermaßen</Check>
                <Warn>
                  Unbekannte Tanknummern werden beim Import automatisch mit einer Standardgröße (5000 L)
                  angelegt — bei Tippfehlern anschließend in der Tankverwaltung korrigieren.
                </Warn>
              </StepCard>

              <StepCard number={3} color="orange" title="Zugang / Abgang buchen">
                <Check>
                  Im Tab <strong>Lagerbestand</strong>, in der Artikel-Zeile das <strong>grüne Plus-Symbol</strong>{' '}
                  für Zugang bzw. das <strong>orangene Symbol</strong> für Abgang anklicken
                </Check>
                <Check>Menge in Litern, Datum und optional eine Bemerkung eintragen</Check>
                <Check>
                  Bestand und Reinalkohol (LA) werden nach jeder Buchung automatisch neu berechnet — sichtbar in
                  Tabelle, Zusammenfassung und Rohexport
                </Check>
                <Check>
                  Jede Buchung landet zusätzlich im <strong>Buchungsjournal</strong>-Tab — chronologisch und
                  nachvollziehbar, egal ob manuell, aus Rezeptur, Versand oder Lohnbrand ausgelöst
                </Check>
                <Warn>
                  Ein Abgang über dem verfügbaren Bestand wird jetzt abgelehnt (Fehlermeldung statt stiller,
                  falscher Buchung).
                </Warn>
              </StepCard>

              <StepCard number={4} color="purple" title="Export & Übersicht">
                <Check>Im Tab <strong>Lagerbestand</strong>: „Lagerübersicht" (Summen je Artikel) und „Aktuellen Lagerbestand" (alle Einzelposten) je als XLSX exportieren — z.B. für Inventur oder Zollmeldung</Check>
                <Check>Im Tab <strong>Buchungsjournal</strong>: das Transaktionsprotokoll (alle Zugänge/Abgänge/Korrekturen) ebenfalls als XLSX exportierbar, dort auch durchsuch- und filterbar</Check>
              </StepCard>
            </div>

            <Tip color="green">
              Tank-Definitionen und QR-Codes für die physischen Behälter werden im selben Bereich verwaltet — siehe
              Abschnitt „QR-Code Tankverwaltung" unten. Wird ein Tank mehrfach mit unterschiedlichen Chargen
              nachgefüllt (gepoolt), zeigt die Spalte „Charge" in der Bestandstabelle die kombinierte
              Chargennummer (z.B. „2500 + 2600"); die genaue Aufteilung nach Litern je Charge zeigt zusätzlich
              der QR-Code-Tankviewer (siehe unten).
            </Tip>
          </CardContent>
        )}
      </Card>

      {/* Einlagern */}
      <Card className="mb-6">
        <SectionHeader id="einlagerung" icon={<Droplets className="h-6 w-6 text-cyan-600" />} title="💧 Einlagern" badge="Neu" />
        {expandedSection === 'einlagerung' && (
          <CardContent className="space-y-6">
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <h3 className="font-semibold text-cyan-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <p className="text-cyan-700 text-sm">
                Direkter Weg, um eine neue Menge (z.B. extern zugekaufte Ware oder eine Charge ohne eigenes
                Mazerations- oder Rezeptur-Protokoll) in einen oder mehrere Tanks einzubuchen — ohne Umweg über ein
                Mazerationsformular. Liegt im Zieltank bereits dasselbe Produkt, wird automatisch zu einem Posten mit
                neu berechnetem Misch-ABV verschmolzen, statt eine zweite Zeile anzulegen.
              </p>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="blue" title="Produktdaten erfassen">
                <Check>Produktname und optional Chargennummer eintragen (bekannte Chargen werden als Vorschlag angeboten)</Check>
                <Check>Kategorie, Alkoholgehalt (%vol.) und Gesamtmenge (L) angeben</Check>
                <Warn>Ist unter „Kategorie" nichts auswählbar, zuerst unter Einstellungen → Kategorien mindestens eine Kategorie anlegen.</Warn>
              </StepCard>

              <StepCard number={2} color="green" title="Zieltank(s) wählen">
                <Check>Je Zieltank werden Kapazität, aktuell belegte Menge und freie Menge sofort angezeigt</Check>
                <Check>Enthält der Tank bereits dasselbe Produkt, wird die resultierende Gesamtmenge und der neue Misch-ABV live vorgerechnet</Check>
                <Warn>Enthält der Tank ein anderes Produkt oder würde die Kapazität überschritten, erscheint eine deutliche Warnung — eingelagert werden kann trotzdem, falls das beabsichtigt ist.</Warn>
              </StepCard>

              <StepCard number={3} color="orange" title="Auf mehrere Tanks aufteilen (optional)">
                <Check>„Weiterer Tank" fügt eine zusätzliche Zeile hinzu, falls die Menge nicht in einen Tank passt</Check>
                <Check>Die Anzeige „Noch zu verteilen" zeigt, ob die Summe der Zieltank-Mengen bereits der Gesamtmenge entspricht</Check>
              </StepCard>

              <StepCard number={4} color="pink" title="Einlagern & Buchen" icon={<PackageCheck className="h-4 w-4 ml-1" />}>
                <Check>Bucht den Zugang sofort für jeden angegebenen Zieltank</Check>
                <Check>Taucht danach wie jede andere Buchung im Buchungsjournal der Lagerverwaltung auf</Check>
              </StepCard>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Rezepturen (GFKC) */}
      <Card className="mb-6">
        <SectionHeader id="rezepturen" icon={<Beaker className="h-6 w-6 text-pink-600" />} title="🧪 Rezepturen (GFKC)" badge="Neu" />
        {expandedSection === 'rezepturen' && (
          <CardContent className="space-y-6">
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h3 className="font-semibold text-pink-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <div className="text-pink-700 text-sm space-y-2">
                <p>
                  Für die GFKC-Ausmischung gibt es keine fixe Rezeptur, nur eine grobe Näherung: Komponenten aus
                  dem Lagerbestand werden ausgemischt, mit Einzelkomponenten nachjustiert, der Alkoholgehalt am
                  Ende auf den Zielwert eingestellt (verdünnen oder aufspriten) — <strong>erst dann</strong> wird
                  gebucht. Der Zielwert (z.B. 53,5 %vol.) ist ein <strong>gelebter Richtwert, kein starres
                  Gate</strong>: jede Charge durchläuft ohnehin denselben Freigabeprozess, eine Abweichung bedeutet
                  nur, dass der Lohnabfüller die ABV-Berechnung fürs Endprodukt neu machen muss.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="pink" title="Neue Rezeptur anlegen">
                <Check>Unter <strong>Rezepturen (GFKC)</strong> auf „Neue Rezeptur" klicken</Check>
                <Check>Name (z.B. „GFKC-O Muster 1") und Zielproduktbezeichnung (z.B. „GFKC-O") eingeben</Check>
              </StepCard>

              <StepCard number={2} color="blue" title="Komponenten zusammenstellen">
                <Check>Komponente aus dem echten Lagerbestand wählen und Menge in Litern (oder %) eintragen</Check>
                <Check>
                  Je Komponente <strong>„fix"</strong> markieren (immer volle Menge) oder unmarkiert lassen und
                  einen <strong>Reduktionsfaktor</strong> (0–1) angeben, falls sie nur anteilig einfließt
                </Check>
                <Check>Freie Zutaten wie Wasser über „+ Wasser" ergänzen (werden nicht aus dem Lager abgebucht)</Check>
                <Check>Basismenge festlegen — Ergebnis (Gesamtmenge, Durchschnitts-ABV, Gesamt-LA) wird live berechnet</Check>
              </StepCard>

              <StepCard number={3} color="orange" title="Alkoholkorrektur">
                <Check>Gemessenen ABV und Ziel-ABV eintragen (Ziel-ABV bleibt frei editierbar)</Check>
                <Check>
                  Sprit-Posten aus dem echten Lagerbestand für das Aufspriten auswählen — die tatsächliche
                  Konzentration des gewählten Postens wird verwendet, nicht ein fixer Wert
                </Check>
                <Check>
                  „Korrektur berechnen" zeigt an, ob Wasser (bei zu hohem ABV) oder Sprit (bei zu niedrigem ABV)
                  zugegeben werden muss
                </Check>
              </StepCard>

              <StepCard number={4} color="purple" title="Sensorik & Freigabe">
                <Check>Verkostungsbewertungen (Geruch, Geschmack, Notizen) erfassen</Check>
                <Check>Status schrittweise auf „Test" und „Freigegeben" setzen</Check>
              </StepCard>

              <StepCard number={5} color="green" title="Produzieren & Buchen" icon={<PackageCheck className="h-4 w-4 ml-1" />}>
                <Check>Zieltank und Chargennummer angeben und „Buchen" bestätigen</Check>
                <Check>
                  Bucht automatisch Abgang für jede Komponente (inkl. einer eventuellen Sprit-Korrektur) und legt
                  den fertigen GFKC-Posten im Zieltank an
                </Check>
                <Check>
                  Zeigt danach die <strong>LA-Bilanz</strong> (eingesetzte vs. entstandene LA) sowie den{' '}
                  <strong>tatsächlichen ABV</strong> — diesen Wert braucht der Lohnabfüller für seine eigene
                  Neuberechnung des Endprodukts
                </Check>
                <Warn>Eine produzierte Rezeptur ist abgeschlossen und kann nicht mehr verändert werden.</Warn>
              </StepCard>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Lohnbrand-Aufträge */}
      <Card className="mb-6">
        <SectionHeader id="lohnbrand" icon={<Truck className="h-6 w-6 text-orange-600" />} title="🚚 Lohnbrand-Aufträge" badge="Neu" />
        {expandedSection === 'lohnbrand' && (
          <CardContent className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <p className="text-orange-700 text-sm">
                Mazerate, die extern beim Lohnbrenner destilliert werden, verlassen das Haus in Containern/Fässern
                und kommen als Destillat zurück. Entscheidend ist dabei die <strong>Gesamt-LA</strong>
                (unversteuerter Reinalkohol) über alle Gebinde — nicht nur die Literzahl, da einzelne Gebinde
                unterschiedliche Konzentrationen haben können.
              </p>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="orange" title="Neuen Auftrag anlegen">
                <Check>Unter <strong>Lohnbrand-Aufträge</strong> auf „Neuer Auftrag" klicken</Check>
                <Check>Lohnbrenner (Name/Firma) und Ausgangsdatum eintragen</Check>
                <Check>Ein oder mehrere Gebinde aus dem echten Lagerbestand auswählen, Menge je Gebinde eintragen</Check>
                <Check>Die Gesamt-LA über alle Gebinde wird direkt im Dialog live angezeigt</Check>
                <Check>
                  „Auftrag anlegen &amp; Abgang buchen" bucht den Lagerabgang sofort für alle gewählten Gebinde
                </Check>
                <Tip color="orange">
                  Der Auftrag erhält automatisch eine fortlaufende Nummer im Format <code>LB-&lt;Jahr&gt;-&lt;001&gt;</code>.
                </Tip>
              </StepCard>

              <StepCard number={2} color="blue" title='Status „Unterwegs"'>
                <Check>Der Auftrag erscheint in der Liste „Unterwegs", solange kein Rücklauf verbucht ist</Check>
                <Check>Je Gebinde sind Produkt, Menge, Alkoholgehalt und LA sowie die Ausgangs-LA-Summe sichtbar</Check>
              </StepCard>

              <StepCard number={3} color="green" title="Rücklauf verbuchen" icon={<PackageCheck className="h-4 w-4 ml-1" />}>
                <Check>Beim betroffenen Auftrag auf „Rücklauf verbuchen" klicken</Check>
                <Check>Rücklaufdatum, Zieltank, Produktname des Destillats sowie Menge (L) und Alkohol (%vol.) eintragen</Check>
                <Check>
                  Der <strong>Verlust beim Brennen</strong> (Ausgangs-LA minus Rücklauf-LA, in Litern und Prozent)
                  wird live berechnet und angezeigt, bevor gebucht wird
                </Check>
                <Check>„Rücklauf einbuchen" legt das Destillat als neuen Lagerposten im Zieltank an und schließt den Auftrag ab</Check>
                <Warn>
                  Der Brennverlust wird bewusst dokumentiert, nicht stillschweigend hingenommen — er muss im
                  Gesamt-LA-Bestand erklärbar bleiben.
                </Warn>
              </StepCard>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Versand an Lohnabfüller */}
      <Card className="mb-6">
        <SectionHeader id="versand" icon={<Send className="h-6 w-6 text-indigo-600" />} title="📤 Versand an Lohnabfüller" badge="Neu" />
        {expandedSection === 'versand' && (
          <CardContent className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <p className="text-indigo-700 text-sm">
                Fertige Ware (z.B. GFKC bulk) wird an den Lohnabfüller (Mozart) versendet und kommt als fertig
                abgefüllte Flaschenware zurück. Die App führt nur den <strong>Versand</strong> (Abgang aus dem
                Lager) — die zurückkommende Flaschenware wird nicht als eigener Bulk-Bestand getrackt.
              </p>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="blue" title="Neuen Versand anlegen">
                <Check>Lohnabfüller-Name und Versanddatum eintragen</Check>
                <Check>Ein oder mehrere Gebinde aus dem echten Lagerbestand wählen, je Gebinde die Menge eintragen</Check>
                <Check>Die Gesamtsumme (Liter und LA) über alle gewählten Gebinde wird direkt im Dialog live angezeigt</Check>
              </StepCard>

              <StepCard number={2} color="green" title="Angaben fürs externe Lieferschein-Formular (optional)">
                <Check>Plomben-Nummern und externe Schlumberger-Lieferschein-Nr. eintragen</Check>
                <Check>Brutto- und Taragewicht (per Waage) erfassen — die App rechnet daraus das gewogene Nettogewicht und vergleicht es mit der aus Menge × Dichte geschätzten Variante</Check>
                <Warn>Dient nur der Dokumentation — die App erzeugt kein eigenes Lieferschein-PDF, das offizielle Formular läuft auf Schlumberger-Briefkopf.</Warn>
              </StepCard>

              <StepCard number={3} color="orange" title="Versand anlegen & Abgang buchen" icon={<PackageCheck className="h-4 w-4 ml-1" />}>
                <Check>Bucht sofort den Lagerabgang für alle ausgewählten Gebinde</Check>
                <Check>Der Versand erhält automatisch eine fortlaufende Versandnummer</Check>
              </StepCard>

              <StepCard number={4} color="pink" title="Versand-Historie">
                <Check>Jeder Versand zeigt Gebinde, Mengen, Alkoholgehalt und die Gesamt-LA</Check>
                <Check>Darunter die aufbereiteten Lieferschein-Hilfsdaten (Ladestelle, Charge, Gebindeanzahl, Nettogewicht) zum Abtippen ins externe Formular</Check>
              </StepCard>
            </div>
          </CardContent>
        )}
      </Card>

      {/* QR-Code Tankverwaltung */}
      <Card className="mb-6">
        <SectionHeader id="qr-codes" icon={<QrCode className="h-6 w-6 text-blue-600" />} title="📱 QR-Code Tankverwaltung" />
        {expandedSection === 'qr-codes' && (
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <div className="text-blue-700 text-sm space-y-2">
                <p>
                  Jeder Tank kann einen QR-Code erhalten, der auf dem Smartphone die aktuellen Tank-Infos zeigt —{' '}
                  <strong>ohne App-Installation</strong>. Es gibt dabei zwei Betriebsarten:
                </p>
                <div className="bg-white rounded p-3 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>✅ GitHub-Pages-Modus (empfohlen):</strong>
                      <ul className="mt-1 space-y-1">
                        <li>• Funktioniert von überall — auch unterwegs, ohne WLAN</li>
                        <li>• Voraussetzung: GitHub-Integration aktiviert (siehe unten)</li>
                        <li>• QR-Code zeigt auf die öffentliche GitHub-Pages-Seite</li>
                      </ul>
                    </div>
                    <div>
                      <strong>📶 Lokaler Fallback:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>• Nur im selben WLAN wie der Computer nutzbar</li>
                        <li>• Greift automatisch, falls GitHub Pages (noch) nicht erreichbar ist</li>
                        <li>• Enthält Basisdaten offline als Fallback in der QR-URL</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">🎯 Schritt-für-Schritt Anleitung</h3>

              <StepCard number={1} color="blue" title="GitHub-Integration aktivieren (empfohlen)">
                <Check>Siehe Abschnitt „GitHub-Integration" unten — einmalig einrichten</Check>
                <Warn>Ohne aktivierte Integration funktionieren QR-Codes nur im lokalen WLAN.</Warn>
              </StepCard>

              <StepCard number={2} color="green" title="Tank-Definitionen erstellen & QR-Codes generieren">
                <Check>Navigieren Sie zu <strong>Lagerverwaltung → Tank-Management</strong></Check>
                <Check>„Tanks aus Inventar synchronisieren" lädt automatisch erkannte Tanks</Check>
                <Check>Tank-Kapazitäten prüfen und bei Bedarf anpassen</Check>
                <Check>Checkboxen für gewünschte Tanks aktivieren und „QR-Codes generieren" klicken</Check>
              </StepCard>

              <StepCard number={3} color="purple" title="QR-Codes drucken & anbringen">
                <Check>„QR-Codes drucken" für eine optimierte Druckansicht nutzen</Check>
                <Check>Auf selbstklebende Etiketten drucken (mindestens 4×4 cm empfohlen)</Check>
                <Check>Jeden QR-Code gut sichtbar und vor Feuchtigkeit geschützt am Tank anbringen</Check>
              </StepCard>

              <StepCard number={4} color="orange" title="QR-Code mit Smartphone scannen" icon={<Smartphone className="h-4 w-4 ml-1" />}>
                <Check>Kamera-App oder QR-Scanner öffnen (iPhone/Android)</Check>
                <Check>Auf den QR-Code richten (Abstand ca. 10–20 cm) und den Link öffnen</Check>
                <Check>Zeigt Sorte, Charge, Inhalt (Liter) und Alkoholgehalt in großen, gut lesbaren Karten</Check>
                <Check>
                  Enthält ein Tank mehrere gepoolte Chargen, zeigt die Karte zusätzlich die Zusammensetzung nach
                  Litern je Charge an (z.B. „200 L Charge 2500 + 1800 L Charge 2600")
                </Check>
              </StepCard>

              <StepCard number={5} color="pink" title="Alle-Tanks-Übersicht (ohne einzelnen QR-Scan)">
                <Check>
                  Im GitHub-Pages-Modus ist unter{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    https://woku369.github.io/MazerationsMeister/tank-viewer.html?view=all
                  </code>{' '}
                  eine Übersicht <strong>aller</strong> Tanks auf einmal abrufbar — sortierbar nach Größe oder Artikel
                </Check>
                <Check>
                  Nützlich, wenn schnell der Gesamtstand gebraucht wird (z.B. Frage des Lohnabfüllers nach aktuellem
                  GFKC-Lagerstand, oder bei einer Führung), ohne erst den passenden Einzeltank suchen zu müssen
                </Check>
                <Tip color="pink">
                  Diesen Link als Lesezeichen/Homescreen-Symbol am Smartphone ablegen — dann jederzeit mit einem Tipp
                  erreichbar, auch unterwegs.
                </Tip>
              </StepCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-800">💡 Beste Praktiken</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>🎯 <strong>QR-Position:</strong> In Augenhöhe, gut erreichbar</div>
                  <div>🛡️ <strong>Schutz:</strong> Laminieren oder wetterfeste Etiketten</div>
                  <div>📏 <strong>Größe:</strong> QR-Code mindestens 4×4 cm drucken</div>
                  <div>🔄 <strong>Backup:</strong> Ersatz-QR-Codes vorrätig halten</div>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-amber-800">🚨 Fehlerbehebung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>📱 <strong>QR nicht erkannt:</strong> Mehr Licht, näher heran, saubere Linse</div>
                  <div>🌐 <strong>Seite lädt nicht unterwegs:</strong> GitHub-Integration aktiviert? Siehe unten</div>
                  <div>📶 <strong>Nur im Büro erreichbar:</strong> Läuft noch im lokalen Fallback-Modus</div>
                  <div>🔄 <strong>QR beschädigt:</strong> Neuen Code generieren &amp; drucken</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>

      {/* GitHub-Integration */}
      <Card className="mb-6">
        <SectionHeader id="github" icon={<Github className="h-6 w-6 text-slate-700" />} title="🐙 GitHub-Integration" />
        {expandedSection === 'github' && (
          <CardContent className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Wofür wird das gebraucht?
              </h3>
              <p className="text-slate-700 text-sm">
                Die GitHub-Integration lädt Tank-Daten auf eine öffentliche GitHub-Pages-Seite hoch. Das ist die
                Grundlage dafür, dass QR-Codes auch <strong>von unterwegs</strong> (ohne WLAN im Betrieb)
                funktionieren, und ermöglicht automatische Backup-Commits der Tank-Daten.
              </p>
            </div>

            <StepCard number={1} color="blue" title="Personal Access Token erstellen & einrichten">
              <Check>
                Unter <strong>Einstellungen → GitHub Integration</strong> öffnen
              </Check>
              <Check>
                Token unter GitHub → Settings → Developer settings → Personal access tokens erstellen und im Feld{' '}
                <strong>„GitHub Personal Access Token"</strong> eintragen
              </Check>
              <Check>Checkbox <strong>„GitHub-Integration aktivieren"</strong> setzen</Check>
              <Check>„GitHub-Konfiguration speichern" klicken</Check>
            </StepCard>

            <StepCard number={2} color="green" title="Auto-Sync einrichten (optional)">
              <Check>„Auto-Sync aktivieren" setzen und das gewünschte Sync-Intervall in Minuten festlegen</Check>
              <Check>Tank-Daten werden dann automatisch im gewählten Rhythmus zu GitHub hochgeladen</Check>
              <Check>„Jetzt synchronisieren" stößt bei Bedarf sofort eine manuelle Synchronisation an</Check>
            </StepCard>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              Der Status-Block unten auf der Einstellungen-Seite zeigt jederzeit, ob Integration und Token korrekt
              konfiguriert sind.
            </div>
          </CardContent>
        )}
      </Card>

      {/* OneDrive-Synchronisation */}
      <Card className="mb-6">
        <SectionHeader id="onedrive" icon={<Settings className="h-6 w-6 text-blue-600" />} title="☁️ OneDrive-Synchronisation" />
        {expandedSection === 'onedrive' && (
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <p className="text-blue-700 text-sm">
                Alle Eingaben werden sofort im Browser (localStorage) gespeichert. Für eine zusätzliche
                Cloud-Sicherung lassen sich Daten manuell als XLSX/JSON in einen OneDrive-Ordner exportieren —{' '}
                <strong>keine Azure-Registrierung nötig</strong>.
              </p>
            </div>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">⚙️ Setup in der App</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Check>Einstellungen → Tab „OneDrive QR-Codes" öffnen</Check>
                <Check>OneDrive-Freigabe-URL eintragen (für QR-Code-Fallback ohne GitHub-Integration)</Check>
                <Check>„Konfiguration speichern" und anschließend „Verbindung testen" klicken</Check>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-800">✅ Automatisch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>🔄 <strong>LocalStorage:</strong> Sofortige Speicherung jeder Eingabe im Browser</div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800">📤 Manuell</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>📊 <strong>XLSX-Export:</strong> Lagerübersicht, Transaktionsprotokoll, Sammelliste</div>
                  <div>📄 <strong>PDF/DOCX:</strong> Mazerationsprotokolle</div>
                  <div>📁 <strong>Ablage:</strong> Manuell in den gewünschten OneDrive-Ordner verschieben</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Footer */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2 flex items-center justify-center gap-2">
              <BookOpen className="h-4 w-4" />
              <strong>MazerationsMeister</strong>
            </p>
            <p>Bei Fragen oder Problemen wenden Sie sich an den System-Administrator.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
