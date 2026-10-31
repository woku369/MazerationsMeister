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
  Package,
  CalendarClock,
} from 'lucide-react';

type SectionId =
  | 'mazerationen'
  | 'sammelliste'
  | 'lagerverwaltung'
  | 'einlagerung'
  | 'rezepturen'
  | 'lohnbrand'
  | 'leergebinde'
  | 'versand'
  | 'qr-codes'
  | 'github'
  | 'onedrive'
  | 'google-calendar';

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
    description: 'Testansatz ausmischen, Scale-up ableiten, Alkoholkorrektur, Produzieren & Buchen.',
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
    id: 'leergebinde',
    icon: <Package className="h-5 w-5 text-slate-600" />,
    title: 'Leergebinde',
    description: 'Versandgebinde (z.B. IBCs) anlegen, befüllen, für den Versand bereitstellen.',
    badge: 'Neu',
  },
  {
    id: 'versand',
    icon: <Send className="h-5 w-5 text-indigo-600" />,
    title: 'Versand an Lohnabfüller',
    description: 'Befüllte Gebinde versenden, Abgang buchen, Lieferschein-Hilfsdaten.',
    badge: 'Neu',
  },
  {
    id: 'qr-codes',
    icon: <QrCode className="h-5 w-5 text-blue-600" />,
    title: 'Tank-Verwaltung & QR-Codes',
    description: 'Tanks/Gebinde anlegen, splitten, mit QR-Codes versehen und mobil abrufen.',
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
  {
    id: 'google-calendar',
    icon: <CalendarClock className="h-5 w-5 text-blue-600" />,
    title: 'Google Calendar',
    description: 'Persönlicher Kalender im Dashboard, mit Terminen anlegen/ändern.',
    badge: 'Neu',
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
                <Check>Bei Einwaage mit Kisten bzw. Paletten: Anzahl und Tara eintragen — das Nettogewicht wird automatisch berechnet</Check>
              </StepCard>

              <StepCard number={2} color="blue" title="Alkoholinformationen">
                <Check>Eingesetzten Sprit (Menge in Litern, Alkoholgehalt %vol.) erfassen</Check>
                <Check>Oder Anfangs- und Endstand am <strong>Steigrohr</strong> eintragen — die Spritmenge ergibt sich automatisch aus der Differenz</Check>
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
                  <strong>„Leeres Protokoll Exportieren"</strong> für einen einseitigen Vordruck mit Ausfülllinien
                  (z.B. zum handschriftlichen Erfassen im Mazerationsraum) — inkl. Kisten-/Paletten-Tara, Steigrohr,
                  Zieltank, Spindel-Methode und Zeitaufzeichnung
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
                Die Seite ist in vier Tabs gegliedert: <strong>Lagerbestand</strong> (Summen je Artikel, öffnet sich
                standardmäßig), <strong>Chargenübersicht</strong> (jeder einzelne Posten mit Charge, Tank, Menge und
                ABV — hier wird gebucht), <strong>Buchungsjournal</strong> und <strong>Artikelstamm</strong> — letzterer
                steht bewusst hinten, da Produkte meist nur einmalig angelegt werden. Lange Tabellen scrollen in ihrem
                eigenen Bereich; der horizontale Scrollbalken liegt immer am unteren Rand der Tabelle.
              </p>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="green" title="Artikelstamm anlegen oder importieren">
                <Check>Im Tab <strong>Artikelstamm</strong>: neue Artikel manuell anlegen oder als XLSX importieren (Artikelnummer, Produktname erforderlich)</Check>
                <Check>Kategorie je Artikel nachträglich zuordnen (z.B. Mazerat, Destillat, Sprit, GFKC)</Check>
                <Check>Fehlende Artikel werden beim Öffnen der Lagerverwaltung automatisch aus dem Lagerbestand übernommen — Mazerat und Destillat derselben Pflanze als zwei getrennte Artikel</Check>
              </StepCard>

              <StepCard number={2} color="blue" title="Lagerbestand erfassen oder importieren">
                <Check>Im Tab <strong>Chargenübersicht</strong>: einzeln über „Neue Charge/Bestand anlegen" mit Chargennummer, Tanknummer, Menge und Alkoholgehalt anlegen (optional mit „Artikel aus Stammdaten" vorausfüllen)</Check>
                <Check>Oder als XLSX-Bestandsliste importieren (Chargennummer + Menge erforderlich) — der Import-Bereich oberhalb der Tabs funktioniert für Artikelstamm- und Lagerbestand-Dateien gleichermaßen</Check>
                <Warn>
                  Unbekannte Tanknummern werden beim Import automatisch mit einer Standardgröße (5000 L)
                  angelegt — bei Tippfehlern anschließend in der Tankverwaltung korrigieren.
                </Warn>
              </StepCard>

              <StepCard number={3} color="orange" title="Zugang / Abgang buchen">
                <Check>
                  Im Tab <strong>Chargenübersicht</strong> oben im Tabellenkopf auf <strong>„Zugang buchen"</strong>{' '}
                  bzw. <strong>„Abgang buchen"</strong> klicken, im Suchfeld den Posten finden (z.B. „Sprit" oder eine
                  Tanknummer eintippen) und anklicken
                </Check>
                <Check>
                  Alternativ ganz rechts in der Tabellenzeile das <strong>grüne Plus-Symbol</strong> (Zugang) bzw. das{' '}
                  <strong>orangene Minus-Symbol</strong> (Abgang) — Spalte „Aktionen"
                </Check>
                <Check>Menge in Litern, Datum des Vorgangs und optional eine Bemerkung eintragen</Check>
                <Check>
                  Bestand und Reinalkohol (LA) werden nach jeder Buchung automatisch neu berechnet
                </Check>
                <Warn>
                  Ein Abgang über dem verfügbaren Bestand wird abgelehnt. Bei „Abgang buchen" werden leere Posten
                  (0 L) gar nicht erst zur Auswahl angeboten.
                </Warn>
              </StepCard>

              <StepCard number={4} color="pink" title="Bestand korrigieren (Menge, ABV, Dichte)">
                <Check>In der Chargenübersicht beim Posten auf das <strong>Stift-Symbol</strong> (Bearbeiten) klicken und Menge, Alkoholgehalt oder Dichte bei 20°C anpassen — z.B. nach Inventur oder einer amtlichen Alkoholbestimmung</Check>
                <Check>Sobald sich Menge, ABV oder Dichte ändern, ist ein <strong>Grund</strong> Pflicht — er landet zusammen mit Vorher/Nachher und der LA-Differenz als „Korrektur" im Buchungsjournal</Check>
              </StepCard>

              <StepCard number={5} color="blue" title="Buchungsjournal">
                <Check>
                  Jede Buchung landet automatisch im <strong>Buchungsjournal</strong> — egal ob manuell, aus Einlagern,
                  Rezeptur, Versand oder Lohnbrand ausgelöst. Durchsuchbar nach Produkt, Charge, Artikel-Nr. und Tank,
                  filterbar nach Typ und Zeitraum
                </Check>
                <Check>
                  Zwei Datumsspalten: <strong>„Datum"</strong> ist der tatsächliche Vorgang (beim Nachbuchen frei
                  wählbar), <strong>„Erfasst am"</strong> zeigt, wann die Buchung eingetragen wurde
                </Check>
                <Check>Ein falsches Vorgangsdatum lässt sich über das kleine Stift-Symbol neben dem Datum korrigieren („Datum korrigieren") — die Korrektur wird in den Bemerkungen vermerkt</Check>
                <Check>
                  Standardmäßig ab 10.10.2026 gefiltert (Produktivstart) und mit gesetztem Haken{' '}
                  <strong>„Richtigstellungen ausblenden"</strong> (z.B. Gebinde-Splitten, keine echte Bestandsbewegung).
                  Die Filter bleiben gespeichert; <strong>„Filter zurücksetzen"</strong> zeigt alles wieder
                </Check>
                <Warn>Buchungen werden nie gelöscht, nur ausgeblendet — das Journal bleibt lückenlos.</Warn>
              </StepCard>

              <StepCard number={6} color="purple" title="Export">
                <Check>Tab <strong>Lagerbestand</strong>: „Lagerübersicht exportieren" (Summen je Artikel)</Check>
                <Check>Tab <strong>Chargenübersicht</strong>: „Export (XLSX)" im Tabellenkopf (alle Einzelposten) — z.B. für Inventur oder Zollmeldung</Check>
                <Check>Tab <strong>Buchungsjournal</strong>: das Transaktionsprotokoll mit Tank, ABV und LA je Buchung</Check>
              </StepCard>
            </div>

            <Tip color="green">
              Tank-Definitionen und QR-Codes für die physischen Behälter werden im eigenen Menüpunkt
              „Tank-Verwaltung" verwaltet — siehe Abschnitt „Tank-Verwaltung &amp; QR-Codes" unten. Wird ein Tank
              mehrfach mit unterschiedlichen Chargen nachgefüllt (gepoolt), zeigt die Spalte „Charge" die kombinierte
              Chargennummer (z.B. „2500 + 2600"); die Tank-Verwaltung zeigt je Tank Inhalt, ABV und Charge, der
              QR-Code-Tankviewer zusätzlich die Aufteilung nach Litern je Charge.
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
                <Check>Am besten über <strong>„Artikel aus Stammdaten (optional)"</strong> einen bestehenden Artikel wählen — füllt Produktname, Kategorie und Dichte vor und verhindert Tippfehler-Dubletten</Check>
                <Check>Optional Chargennummer eintragen (bekannte Chargen werden als Vorschlag angeboten)</Check>
                <Check>Kategorie, Alkoholgehalt (%vol.) und Gesamtmenge (L) angeben — ohne Kategorie lässt sich nicht einlagern</Check>
                <Check><strong>„Datum der Einlagerung"</strong>: standardmäßig heute, beim Nachbuchen auf das tatsächliche Datum setzen</Check>
                <Warn>Die Kategorien „M" und „Dest" sind von Anfang an vorhanden; weitere unter Einstellungen → Kategorien anlegen.</Warn>
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
                  Für die GFKC-Ausmischung gibt es keine fixe Rezeptur, nur eine grobe Näherung — jedes Jahr wird
                  vom Ergebnis der letzten Ausmischung ausgegangen und versucht, möglichst nahe heranzukommen,
                  da sich die sensorischen Eigenschaften der Mazerate jährlich ändern. Der Ablauf läuft deshalb
                  in <strong>zwei Stufen</strong>: zuerst ein kleiner <strong>Testansatz</strong> im Litermaßstab
                  zum Austüfteln von Rezept und Alkoholgehalt, danach erst das <strong>Scale-up</strong> auf
                  Produktionsmenge im selben Verhältnis. Der Zielwert (z.B. 53,5 %vol.) ist ein{' '}
                  <strong>gelebter Richtwert, kein starres Gate</strong>: jede Charge durchläuft ohnehin denselben
                  Freigabeprozess, eine Abweichung bedeutet nur, dass der Lohnabfüller die ABV-Berechnung fürs
                  Endprodukt neu machen muss.
                </p>
                <p>
                  <strong>Sonderfall Direktverschnitt:</strong> Sollen nur bereits gelagerte, bekannte Mengen zu einem
                  Posten zusammengeführt werden (z.B. GFKC-Altbestände), beim Anlegen das Häkchen{' '}
                  <strong>„Direktverschnitt bereits gelagerter Mengen"</strong> setzen — siehe Schritt 6.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="pink" title="Testansatz anlegen und zusammenstellen">
                <Check>Unter <strong>Rezepturen (GFKC)</strong> auf „Neue Rezeptur" klicken, Name und Zielproduktbezeichnung (z.B. „GFKC-O") eingeben</Check>
                <Check>Basismenge auf den Testansatz setzen (üblich: ca. 1 Liter)</Check>
                <Check>Komponenten aus dem echten Lagerbestand wählen und Menge in Litern (oder %) eintragen — z.B. GFKC der letzten Charge vorlegen, dann Mazerate/Destillate zugeben</Check>
                <Check>
                  Je Komponente <strong>„fix"</strong> markieren (immer volle Menge) oder unmarkiert lassen und
                  einen <strong>Reduktionsfaktor</strong> (0–1) angeben, falls sie nur anteilig einfließt
                </Check>
                <Check>Freie Zutaten wie Wasser über „+ Wasser" ergänzen (werden nicht aus dem Lager abgebucht)</Check>
              </StepCard>

              <StepCard number={2} color="blue" title="Testansatz: Sensorik, Alkoholkorrektur & Freigabe">
                <Check>Sensorische Prüfung — bei Bedarf Komponenten nachjustieren und erneut prüfen</Check>
                <Check>Gemessenen ABV und Ziel-ABV eintragen, Sprit-Posten für ein eventuelles Aufspriten aus dem echten Lagerbestand wählen (Konzentration kommt automatisch aus dem gewählten Posten), „Korrektur berechnen" klicken</Check>
                <Check>Verkostungsbewertung erfassen, Status schrittweise auf „Test" und — wenn der Testansatz passt — auf <strong>„Freigegeben"</strong> setzen</Check>
              </StepCard>

              <StepCard number={3} color="orange" title="Scale-up ableiten">
                <Check>Sobald der Testansatz „Freigegeben" ist, erscheint der Button <strong>„Scale-up ableiten"</strong></Check>
                <Check>Ausmisch-Tank wählen — die App zeigt sofort die maximal mögliche Produktionsmenge, begrenzt durch die knappste verfügbare Komponente <strong>oder</strong> die Tankkapazität (im Klartext, welcher der beiden Faktoren tatsächlich greift)</Check>
                <Check>Ist der Ausmisch-Tank schon teilweise befüllt, zeigt der Dialog die bereits enthaltene Menge und rechnet nur mit der freien Kapazität</Check>
                <Check>Produktionsmenge eintragen (Maximalmenge lässt sich per Klick übernehmen) und „Scale-up erstellen" bestätigen</Check>
                <Check>Legt eine neue, verknüpfte Rezeptur im selben Komponentenverhältnis an und öffnet sie direkt</Check>
              </StepCard>

              <StepCard number={4} color="purple" title="Scale-up: Vergleich, Nachbesserung & Freigabe">
                <Check>Jede Komponentenzeile zeigt jetzt zusätzlich „→ X L für Produktion" — das ist die tatsächlich zu entnehmende Menge, nicht mehr die kleine Testansatz-Menge</Check>
                <Check>Die Karte „Vergleich mit Testansatz" zeigt Ergebnis und Sensorik-Bewertungen des Testansatzes zur direkten Gegenprobe</Check>
                <Check>Bei Bedarf Komponenten nachjustieren — die Produktionsmenge je Komponente bleibt dabei automatisch synchron</Check>
                <Check>Erneut Sensorik erfassen und vergleichen, dann wieder auf „Test" und „Freigegeben" setzen</Check>
              </StepCard>

              <StepCard number={5} color="green" title="Produzieren & Buchen" icon={<PackageCheck className="h-4 w-4 ml-1" />}>
                <Check>Auf der freigegebenen Scale-up-Rezeptur: Zieltank, Chargennummer und <strong>„Datum der Produktion"</strong> (beim Nachbuchen das tatsächliche Datum) angeben und „Buchen" bestätigen</Check>
                <Check>
                  Bucht automatisch Abgang für jede Komponente in Produktionsmenge (inkl. einer eventuellen
                  Sprit-Korrektur) und legt den fertigen GFKC-Posten im Zieltank an
                </Check>
                <Check>
                  Zeigt danach die <strong>LA-Bilanz</strong> (eingesetzte vs. entstandene LA) sowie den{' '}
                  <strong>tatsächlichen ABV</strong> — diesen Wert braucht der Lohnabfüller für seine eigene
                  Neuberechnung des Endprodukts
                </Check>
                <Warn>Eine produzierte Rezeptur ist abgeschlossen und kann nicht mehr verändert werden.</Warn>
              </StepCard>

              <StepCard number={6} color="orange" title="Sonderfall: Direktverschnitt bereits gelagerter Mengen">
                <Check>„Neue Rezeptur" → Häkchen <strong>„Direktverschnitt bereits gelagerter Mengen"</strong> setzen</Check>
                <Check>Komponenten direkt in echten Litern eintragen — die Basismenge ergibt sich automatisch aus der Summe</Check>
                <Check>Kein Testansatz, keine Sensorik-Freigabe, kein Scale-up: „Produzieren &amp; Buchen" ist sofort verfügbar, sobald gültige Komponenten eingetragen sind</Check>
                <Warn>Nicht für echte neue Rezepturen verwenden — dafür gilt weiterhin der Ablauf Testansatz → Scale-up.</Warn>
              </StepCard>

              <Tip color="pink">
                Nicht mehr benötigte Rezepturen (z.B. verunglückte Entwürfe) lassen sich in der Rezeptur-Liste
                löschen. Bei bereits produzierten Rezepturen bleiben die gebuchten Lagerbewegungen dabei erhalten.
              </Tip>
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

      {/* Leergebinde */}
      <Card className="mb-6">
        <SectionHeader id="leergebinde" icon={<Package className="h-6 w-6 text-slate-600" />} title="📦 Leergebinde" badge="Neu" />
        {expandedSection === 'leergebinde' && (
          <CardContent className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <p className="text-slate-700 text-sm">
                Bildet den Schritt zwischen Bulk-Tank und Versand ab: Aus einem Tank (z.B. T 341) wird in mehrere
                einzeln benannte Versandgebinde (z.B. 3 IBCs) umgefüllt — jedes mit eigener Bezeichnung, eigenem
                Tara und eigener Füllmenge. Gebinde können schon angelegt werden, <strong>bevor</strong> sie
                physisch vor Ort sind (z.B. Leergut, das der Lohnabfüller noch schickt).
              </p>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="blue" title="Neues Leergebinde anlegen">
                <Check>Bezeichnung (z.B. „IBC-A"), Tara (kg) und optional das Volumen (L) eintragen</Check>
                <Check>Status beim Anlegen wählen: „Schon vor Ort (leer)" oder „Noch nicht da (erwartet)"</Check>
                <Check>Bei „erwartet" zusätzlich optional die Herkunft eintragen (z.B. „Mozart")</Check>
              </StepCard>

              <StepCard number={2} color="green" title="Angekommenes Gebinde freigeben">
                <Check>Ein als „erwartet" angelegtes Gebinde erscheint in der Liste „Erwartet"</Check>
                <Check>„Als angekommen markieren" wechselt es zu „Leer — befüllbar", sobald es physisch eintrifft</Check>
              </StepCard>

              <StepCard number={3} color="orange" title="Befüllen" icon={<PackageCheck className="h-4 w-4 ml-1" />}>
                <Check>Bei einem leeren Gebinde auf „Befüllen" klicken</Check>
                <Check>Quellposten aus dem echten Lagerbestand wählen und die Menge (L) eintragen</Check>
                <Check>Bucht sofort Abgang beim Quellposten und Zugang in das Gebinde (das Gebinde wird dabei selbst zu einem ganz normalen Tank/Lagerort)</Check>
                <Warn>Dasselbe Quellposten kann mehrfach angezapft werden — z.B. 3× 1000 L aus demselben Tank in 3 verschiedene IBCs.</Warn>
              </StepCard>

              <StepCard number={4} color="pink" title="Bereit für den Versand">
                <Check>Befüllte Gebinde erscheinen in der Liste „Befüllt — bereit für den Versand"</Check>
                <Check>Die eigentliche Auswahl fürs Verschicken passiert auf der Seite „Versand an Lohnabfüller" (siehe unten)</Check>
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
                Fertige Ware (z.B. GFKC bulk, bereits in Leergebinde abgefüllt — siehe Abschnitt „Leergebinde" oben)
                wird an den Lohnabfüller (Mozart) versendet und kommt als fertig abgefüllte Flaschenware zurück.
                Die App führt nur den <strong>Versand</strong> (Abgang aus dem Lager) — die zurückkommende
                Flaschenware wird nicht als eigener Bulk-Bestand getrackt.
              </p>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="blue" title="Neuen Versand anlegen">
                <Check>Lohnabfüller-Name und Versanddatum eintragen</Check>
                <Check>Ein oder mehrere bereits befüllte Leergebinde auswählen — jedes geht komplett mit seiner gesamten Füllmenge raus, keine erneute Mengeneingabe nötig</Check>
                <Check>
                  Gebinde, die nicht über „Leergebinde" befüllt wurden (z.B. per Splitten in der Tank-Verwaltung
                  entstanden), stehen in der Auswahl unter <strong>„Direkt aus Lagerbestand (noch nicht als
                  Leergebinde erfasst)"</strong>. Fehlt dort das Tara, erscheint ein eigenes Eingabefeld dafür; das
                  Gebinde wird beim Anlegen des Versands automatisch als Leergebinde registriert
                </Check>
                <Check>Die Gesamtsumme (Liter, LA und Gewicht) über alle gewählten Gebinde wird direkt im Dialog live angezeigt</Check>
              </StepCard>

              <StepCard number={2} color="green" title="Angaben fürs externe Lieferschein-Formular (optional)">
                <Check>Plomben-Nummern und externe Schlumberger-Lieferschein-Nr. eintragen</Check>
                <Check>Brutto- und Nettogewicht werden automatisch aus dem Tara jedes einzelnen Gebindes (siehe „Leergebinde") und der Menge × Dichte berechnet — kein manuelles Wiegen-Eingabefeld mehr nötig</Check>
                <Warn>Dient nur der Dokumentation — die App erzeugt kein eigenes Lieferschein-PDF, das offizielle Formular läuft auf Schlumberger-Briefkopf.</Warn>
              </StepCard>

              <StepCard number={3} color="orange" title="Versand anlegen & Abgang buchen" icon={<PackageCheck className="h-4 w-4 ml-1" />}>
                <Check>Bucht sofort den Lagerabgang für alle ausgewählten Gebinde</Check>
                <Check>Der Versand erhält automatisch eine fortlaufende Versandnummer</Check>
                <Check>Die verschickten Leergebinde wechseln automatisch in den Status „Versendet"</Check>
              </StepCard>

              <StepCard number={4} color="pink" title="Versand-Historie">
                <Check>Jeder Versand zeigt Gebinde, Mengen, Alkoholgehalt und die Gesamt-LA</Check>
                <Check>Darunter die aufbereiteten Lieferschein-Hilfsdaten (Ladestelle, Charge, Gebindeanzahl, Nettogewicht) zum Abtippen ins externe Formular</Check>
              </StepCard>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tank-Verwaltung & QR-Codes */}
      <Card className="mb-6">
        <SectionHeader id="qr-codes" icon={<QrCode className="h-6 w-6 text-blue-600" />} title="📱 Tank-Verwaltung & QR-Codes" />
        {expandedSection === 'qr-codes' && (
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <div className="text-blue-700 text-sm space-y-2">
                <p>
                  Eigener Menüpunkt „Tank-Verwaltung" in der Seitenleiste (bis Aufgabe 55 ein Tab unter
                  Einstellungen) — hier werden Tanks und Gebinde verwaltet und jeder kann einen QR-Code erhalten,
                  der auf dem Smartphone die aktuellen Infos zeigt — <strong>ohne App-Installation</strong>. Es gibt
                  dabei zwei Betriebsarten für den QR-Code:
                </p>
                <div className="bg-white rounded p-3 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>✅ Live-Modus (empfohlen):</strong>
                      <ul className="mt-1 space-y-1">
                        <li>• Voraussetzung: GitHub-Integration aktiviert (siehe unten)</li>
                        <li>• Zeigt beim Scannen immer den aktuell synchronisierten Stand</li>
                        <li>• Funktioniert von überall per Mobilfunk — auch unterwegs, ohne WLAN</li>
                      </ul>
                    </div>
                    <div>
                      <strong>📸 Schnappschuss-Modus:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>• Greift ohne GitHub-Integration (oder falls GitHub Pages gerade nicht erreichbar ist)</li>
                        <li>• Ebenfalls per Mobilfunk von überall lesbar</li>
                        <li>• Zeigt aber nur den Stand vom Zeitpunkt, an dem der QR-Code erzeugt wurde — nach Buchungen neu erzeugen</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">🎯 Schritt-für-Schritt Anleitung</h3>

              <StepCard number={1} color="blue" title="GitHub-Integration aktivieren (empfohlen)">
                <Check>Siehe Abschnitt „GitHub-Integration" unten — einmalig einrichten (geht auch direkt von dieser Seite aus über den Button „GitHub verbinden")</Check>
                <Warn>Ohne aktivierte Integration zeigen QR-Codes nur den Stand vom Zeitpunkt ihrer Erzeugung.</Warn>
              </StepCard>

              <StepCard number={2} color="green" title="Tanks/Gebinde anlegen oder automatisch übernehmen">
                <Check>Navigieren Sie zu <strong>Tank-Verwaltung</strong> in der Seitenleiste</Check>
                <Check>Neue Tanknummern aus Mazeration/Einlagerung/Import werden automatisch als Tank übernommen — kein manueller Sync-Schritt nötig</Check>
                <Check>Alternativ „Neuen Tank hinzufügen" für eine manuelle Anlage (Tank-Nummer, Bezeichnung, Kapazität, optional Tara)</Check>
                <Check>Jede Karte zeigt Kapazität, Tara (falls eingetragen) und den Inhalt — je Posten eine eigene Zeile mit Kategorie, Menge, Alkoholgehalt und Charge</Check>
                <Check>Über der Liste: Sortierung nach Tanknummer, Bezeichnung, Sorte oder Kapazität sowie das Häkchen „Nur leere Tanks/Gebinde anzeigen"</Check>
              </StepCard>

              <StepCard number={3} color="orange" title="Gebinde splitten (falls ein Posten mehrere physische Behälter zusammenfasst)">
                <Check>„Splitten" bei einem befüllten Gebinde öffnet den Aufteilungs-Dialog</Check>
                <Check>Je neuem Gebinde eigene Bezeichnung, Menge, Kapazität und optional Tara eintragen — die Summe der Mengen muss der bisherigen Gesamtmenge entsprechen</Check>
                <Check>Bucht den Abgang beim bisherigen Sammelposten und legt die neuen Gebinde als eigene, einzeln QR-codierbare Tanks an</Check>
                <Check>Diese Buchungen sind als <strong>Richtigstellung</strong> markiert (keine echte Bestandsbewegung) und im Buchungsjournal standardmäßig ausgeblendet</Check>
              </StepCard>

              <StepCard number={4} color="purple" title="QR-Code erzeugen & anbringen">
                <Check>Bei einem Tank auf „QR-Code" klicken und im Dialog <strong>„Herunterladen"</strong> (PNG)</Check>
                <Check>Die PNG-Datei auf selbstklebende Etiketten drucken (mindestens 4×4 cm empfohlen)</Check>
                <Warn>Der Button „Drucken" im Dialog druckt derzeit das ganze Programmfenster, nicht nur den QR-Code — für saubere Etiketten den Weg über „Herunterladen" nehmen.</Warn>
                <Check>Jeden QR-Code gut sichtbar und vor Feuchtigkeit geschützt am Tank/Gebinde anbringen</Check>
              </StepCard>

              <StepCard number={5} color="orange" title="QR-Code mit Smartphone scannen" icon={<Smartphone className="h-4 w-4 ml-1" />}>
                <Check>Kamera-App oder QR-Scanner öffnen (iPhone/Android)</Check>
                <Check>Auf den QR-Code richten (Abstand ca. 10–20 cm) und den Link öffnen</Check>
                <Check>Zeigt Sorte, Charge, Inhalt (Liter) und Alkoholgehalt in großen, gut lesbaren Karten</Check>
                <Check>
                  Enthält ein Tank mehrere gepoolte Chargen, zeigt die Karte zusätzlich die Zusammensetzung nach
                  Litern je Charge an (z.B. „200 L Charge 2500 + 1800 L Charge 2600")
                </Check>
              </StepCard>

              <StepCard number={6} color="pink" title="Alle-Tanks-Übersicht (ohne einzelnen QR-Scan)">
                <Check>
                  Im GitHub-Pages-Modus ist unter{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    https://woku369.github.io/MazerationsMeister/tank-viewer.html?view=all
                  </code>{' '}
                  eine Übersicht <strong>aller</strong> Tanks auf einmal abrufbar — sortierbar nach Tanknummer, Name,
                  Größe oder Artikel, mit Filter „Nur leere anzeigen"
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
                  <div>🌐 <strong>Seite lädt nicht:</strong> Mobilfunk/Internet am Handy prüfen</div>
                  <div>🕓 <strong>Zeigt veralteten Stand:</strong> GitHub-Integration aktiviert? Sonst QR-Code nach Buchungen neu erzeugen</div>
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
                Die GitHub-Integration hat zwei Aufgaben: Sie lädt die Tank-Daten auf eine öffentliche
                GitHub-Pages-Seite hoch (Grundlage dafür, dass QR-Codes <strong>von unterwegs</strong> den aktuellen
                Stand zeigen), und sie sichert den kompletten Datenstand, damit er auf einem zweiten Rechner
                (z.B. Heimrechner und Büro) verfügbar ist.
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

            <StepCard number={2} color="green" title="Tank-Daten automatisch hochladen (für die QR-Codes)">
              <Check>Im selben Tab „Auto-Sync aktivieren" setzen und das gewünschte Sync-Intervall in Minuten festlegen</Check>
              <Check>Tank-Daten werden dann automatisch im gewählten Rhythmus zu GitHub hochgeladen</Check>
              <Check>„Jetzt synchronisieren" stößt bei Bedarf sofort eine manuelle Synchronisation an</Check>
            </StepCard>

            <StepCard number={3} color="orange" title="Datensicherung & Abgleich zwischen mehreren Rechnern">
              <Check>
                Unter <strong>Einstellungen → Datensicherung</strong>: „Jetzt zu GitHub sichern" bzw. „Von GitHub
                laden" — umfasst Artikelstamm, Lagerbestand, Buchungsjournal, Tanks, Mazerationen, Rezepturen,
                Lohnbrand und Versand
              </Check>
              <Check>
                Mit <strong>„Automatisch synchronisieren"</strong> läuft der Abgleich regelmäßig und beim Beenden der
                App von selbst. Beim Schließen erscheint kurz „Vor dem Beenden gesichert" (oder eine Fehlermeldung,
                falls das Sichern nicht geklappt hat)
              </Check>
              <Check>
                Ein neuerer Stand vom anderen Rechner wird nur dann automatisch übernommen, wenn hier seit dem
                letzten Abgleich nichts geändert wurde. Wurde auf beiden Rechnern gearbeitet, erscheint ein
                „Sync-Konflikt" mit der Wahl „Diesen Rechner behalten" oder „Anderen Rechner übernehmen"
              </Check>
              <Check>Unabhängig von GitHub: „Backup jetzt speichern" legt eine lokale Sicherungsdatei an, „Aus Datei wiederherstellen" spielt sie zurück (mit Vorschau und automatischer Sicherung des jetzigen Stands davor)</Check>
              <Warn>GitHub-Token, Speicherpfade und die Google-Calendar-Anmeldung werden nicht mitübertragen — die richtet man auf jedem Rechner einmal selbst ein.</Warn>
            </StepCard>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              Der <strong>Sync-Verlauf</strong> unter Einstellungen → Datensicherung protokolliert jeden Abgleich
              (bis zu 1000 Einträge, bleibt über Neustarts erhalten) — hilfreich, um im Nachhinein zu sehen, wann
              was hoch- oder heruntergeladen wurde oder warum ein Abgleich fehlschlug.
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
                Alle Eingaben werden sofort im Programm gespeichert. Für eine zusätzliche Ablage lassen sich
                Exporte und Tank-Daten in einen OneDrive-Ordner schreiben —{' '}
                <strong>keine Azure-Registrierung nötig</strong>. Für den Abgleich zwischen zwei Rechnern ist
                dagegen die Datensicherung über GitHub gedacht (siehe Abschnitt „GitHub-Integration").
              </p>
            </div>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">⚙️ Setup in der App</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Check>Einstellungen → Tab <strong>„Speicherpfade"</strong> öffnen</Check>
                <Check>„Lokaler Exportpfad": Ordner für XLSX-Exporte und lokale Backups — kann direkt ein Ordner innerhalb von OneDrive sein</Check>
                <Check>„OneDrive-Synchronisation": OneDrive-Ordner, in den die Tank-Daten automatisch geschrieben werden</Check>
                <Check>Jeweils „Pfad speichern" klicken</Check>
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

      {/* Google Calendar */}
      <Card className="mb-6">
        <SectionHeader id="google-calendar" icon={<CalendarClock className="h-6 w-6 text-blue-600" />} title="📅 Google Calendar" badge="Neu" />
        {expandedSection === 'google-calendar' && (
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Überblick
              </h3>
              <p className="text-blue-700 text-sm">
                Zeigt den persönlichen Google-Kalender direkt im Dashboard an und erlaubt dort Termine
                anlegen, ändern und löschen — <strong>nur im installierten Programm</strong>, nicht im
                Browser, da der Verbindungsaufbau einen lokalen Server braucht.
              </p>
            </div>

            <div className="space-y-4">
              <StepCard number={1} color="blue" title="Einmalig: Google Cloud Projekt einrichten">
                <Check><a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">console.cloud.google.com</a> → neues Projekt anlegen</Check>
                <Check>„APIs & Dienste" → „Bibliothek" → „Google Calendar API" aktivieren</Check>
                <Check>„OAuth-Zustimmungsbildschirm": Nutzertyp „Extern", Bereich <code>https://www.googleapis.com/auth/calendar</code> hinzufügen, eigene Google-Mail-Adresse als Testnutzer eintragen</Check>
                <Check>„Anmeldedaten" → „OAuth-Client-ID" erstellen, Anwendungstyp <strong>„Desktop-App"</strong> wählen → Client-ID und Client-Secret notieren</Check>
                <Check>„OAuth-Zustimmungsbildschirm" → Veröffentlichungsstatus auf <strong>„In Produktion"</strong> stellen. Im Status „Testing" läuft die Anmeldung nach 7 Tagen ab. Für die private Nutzung ist keine Prüfung durch Google nötig; beim Verbinden erscheint einmalig „Google hat diese App nicht überprüft" → „Erweitert" → „Weiter".</Check>
              </StepCard>

              <StepCard number={2} color="purple" title="In der App verbinden">
                <Check>Einstellungen → Tab „Google Calendar"</Check>
                <Check>Client-ID und Client-Secret eintragen, „Verbinden" klicken</Check>
                <Check>Im sich öffnenden Browserfenster bei Google anmelden und zustimmen — das Fenster kann danach geschlossen werden</Check>
              </StepCard>

              <StepCard number={3} color="green" title="Im Dashboard nutzen" icon={<PackageCheck className="h-4 w-4 ml-1" />}>
                <Check>Zeigt die Termine der nächsten 14 Tage</Check>
                <Check>„Termin"-Button legt einen neuen Termin an (Titel, ganztägig oder Uhrzeit, Beschreibung)</Check>
                <Check>Stift-Symbol ändert einen bestehenden Termin, Papierkorb löscht ihn, Pfeil-Symbol öffnet ihn direkt in Google Calendar</Check>
                <Warn>Alle Änderungen wirken sich sofort auf den echten Google-Kalender aus.</Warn>
              </StepCard>
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
