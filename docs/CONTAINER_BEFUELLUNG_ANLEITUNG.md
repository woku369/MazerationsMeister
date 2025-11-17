# Container-Befüllung - Anleitung

**Feature:** Zuordnung von Lagerbeständen zu Tanks/Containern  
**Version:** v1.2.1 (17. November 2025)

---

## Überblick

Die Container-Befüllung ermöglicht es, Lagerbestände (Chargen) direkt einem Tank oder Container zuzuordnen. Dies erfolgt über einen violetten Button in der Lagerverwaltung.

## Schritt-für-Schritt Anleitung

### 1. Lagerverwaltung öffnen

- Navigieren Sie zur **Lagerverwaltung** (Inventory-Seite)
- Scrollen Sie zur **Chargen-Übersicht**

### 2. Produkt auswählen

- Finden Sie das Produkt (Charge), das Sie einem Container zuordnen möchten
- In jeder Zeile der Tabelle sehen Sie mehrere Action-Buttons

### 3. Container-Befüllung starten

- Klicken Sie auf den **violetten Button** mit dem PackageOpen-Icon (📦)
- Beschriftung: "In Container füllen"
- Der Button befindet sich in der Action-Spalte ganz rechts

### 4. Container auswählen

Der Dialog zeigt:

#### Produkt-Information
- **Produktname:** z.B. "Baldrian"
- **Charge:** Chargennummer (falls vorhanden)
- **Menge:** Aktuelle Menge in Litern
- **Alkoholgehalt:** % vol

#### Container-Auswahl
- Dropdown-Liste mit **62 verfügbaren Containern**
- Jeder Container zeigt:
  - **Container-ID:** z.B. "B-1", "Fass-3", "T 341"
  - **Volumen:** Kapazität in Litern

#### Aktueller Container (falls vorhanden)
- Wenn das Produkt bereits einem Container zugeordnet ist, wird dies angezeigt
- Info: "Durch die Zuordnung wird der aktuelle Container ersetzt"

### 5. Zuordnung bestätigen

- Wählen Sie den gewünschten Ziel-Container aus dem Dropdown
- Der **"In Container füllen"** Button wird aktiv
- Klicken Sie auf den Button, um die Zuordnung zu speichern

### 6. Abbruch

- Button **"Abbrechen"** schließt den Dialog ohne Änderungen

## Technische Details

### Container-Typen

Die App verwaltet verschiedene Container-Kategorien:

| Kategorie | Beispiele | Typisches Volumen |
|-----------|-----------|-------------------|
| **B-Tanks** | B-1 bis B-25 | Variabel |
| **Fässer** | Fass-1 bis Fass-6 | 100-300L |
| **T-Tanks** | T 341, T 344, T 347, etc. | 500-5000L |
| **Flaschen** | Fl-1, Fl-2, etc. | 1-10L |
| **IBC/Container** | C 07, Cont-1, etc. | 1000L |
| **Ballons** | Ballon-1, etc. | 25-100L |
| **Kanister** | K-1, K-2, K-3 | 5-25L |

### Automatische Aktualisierung

Nach erfolgreicher Zuordnung:

1. **Tank-Feld** der Charge wird aktualisiert
2. **Tank-Definitionen** werden synchronisiert
3. **Container-Liste** wird neu geladen
4. Änderungen werden sofort gespeichert

### Mehrfach-Zuordnung

- **Erlaubt:** Ein Container kann mehrere Produkte enthalten
- Beim Hinzufügen wird das Produkt zum Container hinzugefügt
- Bestehende Inhalte bleiben erhalten

## Bekannte Einschränkungen

- Keine automatische Füllstand-Prüfung (Überfüllung möglich)
- Keine Validierung der Alkoholgehalte bei gemischten Inhalten
- Container-Kapazitäten sind informativ, nicht restrictiv

## Fehlerbehebung

### Dialog öffnet nicht

**Symptom:** Klick auf violetten Button, aber kein Dialog erscheint

**Lösung in v1.2.1:**
- Bug wurde behoben (FIX 5.10)
- AssignContainerDialog korrekt im Komponenten-Baum platziert
- Falls Problem weiterhin besteht: Browser-Cache leeren + neu laden

### Container-Liste leer

**Problem:** Dropdown zeigt keine Container

**Lösungen:**
1. Prüfen Sie, ob Tank-Definitionen existieren (Gebindeverwaltung)
2. Führen Sie eine Tank-Synchronisation durch
3. Neu laden der Seite (F5)

### Zuordnung wird nicht gespeichert

**Problem:** Container-Zuordnung verschwindet nach Reload

**Lösungen:**
1. Prüfen Sie LocalStorage-Berechtigungen im Browser
2. Prüfen Sie, ob Auto-Save aktiviert ist (Speicher-Einstellungen)
3. Manuell speichern über "Manuell speichern" Button

## Support & Feedback

Bei Fragen oder Problemen:

1. Konsole öffnen (F12) und Fehler prüfen
2. GitHub Issue erstellen mit Fehlerbeschreibung
3. Screenshot des Problems anhängen

---

**Version:** 1.2.1  
**Zuletzt aktualisiert:** 17. November 2025
