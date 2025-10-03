# 📱 QR-Code Tankverwaltung - Anleitung

## Überblick

Die QR-Code-Funktionalität ermöglicht es Ihnen, Ihre Lagertanks mit QR-Codes zu versehen und über das Smartphone schnell auf Tank-Informationen zuzugreifen und diese zu bearbeiten.

## 🎯 Funktionsweise

### Konzept
1. **QR-Code generieren** → für ausgewählte Tanks
2. **QR-Aufkleber drucken** → auf Tanks anbringen  
3. **QR-Code scannen** → mit Smartphone
4. **Tank-Details anzeigen** → aktuelle Füllung, Inhalt, etc.
5. **Direkt bearbeiten** → Füllstand und Inhalt vor Ort aktualisieren

---

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: QR-Codes generieren

1. **Inventar-Seite öffnen**
   - Navigieren Sie zu `Inventar` → Tank-Management
   
2. **Tanks auswählen**
   - Aktivieren Sie die Checkboxen für die gewünschten Tanks
   - Alternativ: "Alle auswählen" für alle Tanks

3. **QR-Codes erstellen**
   - Klicken Sie auf "QR-Codes generieren (X)"
   - Der QR-Code-Dialog öffnet sich mit allen generierten Codes

4. **QR-Codes drucken**
   - Klicken Sie auf "🖨️ Alle drucken" für druckoptimierte Ansicht
   - Alternativ: "💾 Download PNG" für einzelne QR-Codes

### Schritt 2: QR-Aufkleber anbringen

1. **Drucken**
   - Drucken Sie die QR-Codes auf selbstklebende Etiketten
   - Empfohlene Größe: mindestens 3x3 cm für gute Scanbarkeit

2. **Anbringen**
   - Kleben Sie jeden QR-Code auf den entsprechenden Tank
   - Positionierung: gut sichtbar und leicht zugänglich
   - Schutz vor Feuchtigkeit und Beschädigungen beachten

### Schritt 3: QR-Code scannen

1. **Smartphone verwenden**
   - Öffnen Sie die Kamera-App oder einen QR-Scanner
   - Moderne Smartphones erkennen QR-Codes automatisch

2. **QR-Code scannen**
   - Richten Sie die Kamera auf den QR-Code
   - Halten Sie das Smartphone ruhig bis der Code erkannt wird

3. **Link öffnen**
   - Tippen Sie auf die erscheinende Benachrichtigung
   - Der Browser öffnet automatisch die Tank-Detail-Seite

### Schritt 4: Tank-Informationen anzeigen

Nach dem Scannen sehen Sie:

**Tank-Informationen:**
- Tank-Nummer und Bezeichnung
- Gesamtkapazität des Tanks

**Aktuelle Füllung:**
- Füllstand in Prozent (visueller Balken)
- Aktuelle Menge in Litern
- Alkoholgehalt in % vol
- Produktname (z.B. Kirsch, Zwetschke)
- Liter Alkohol absolut (berechnet)

### Schritt 5: Direkte Bearbeitung

1. **Bearbeiten aktivieren**
   - Klicken Sie auf "Bearbeiten" bei "Inhalt bearbeiten"

2. **Werte anpassen**
   - **Menge (L):** Aktuelle Füllmenge eingeben
   - **Alkoholgehalt (% vol):** Alkoholstärke eingeben  
   - **Produktname:** Bezeichnung des Inhalts eingeben

3. **Speichern**
   - Klicken Sie auf "Speichern" um Änderungen zu übernehmen
   - Die Daten werden sofort aktualisiert

---

## 🔧 Technische Details

### QR-Code-Inhalt
Jeder QR-Code enthält eine eindeutige URL:
```
http://[ihre-domain]/inventory/tank/[tank-id]
```

### Unterstützte Geräte
- **Smartphones:** iOS (iPhone) und Android
- **Tablets:** iPad und Android-Tablets
- **Browser:** Alle modernen Browser

### Datenaktualisierung
- Änderungen werden sofort im lokalen Speicher gespeichert
- Synchronisation mit der Hauptanwendung erfolgt automatisch

---

## 💡 Tipps und Best Practices

### QR-Code-Platzierung
- **Position:** Augenhöhe für einfache Bedienung
- **Schutz:** Laminieren oder wetterfeste Aufkleber verwenden
- **Beleuchtung:** Ausreichend Licht für gutes Scannen sicherstellen

### Smartphone-Nutzung
- **Kamera:** Regelmäßig reinigen für bessere Scan-Qualität
- **Apps:** Dedizierte QR-Scanner-Apps für erweiterte Funktionen
- **WLAN:** Stabile Internetverbindung im Lagerbereich

### Wartung
- **QR-Codes:** Regelmäßig auf Beschädigungen prüfen
- **Aktualisierung:** Bei Tank-Änderungen neue QR-Codes generieren
- **Backup:** QR-Codes digital archivieren

---

## 🚨 Fehlerbehebung

### QR-Code wird nicht erkannt
- **Beleuchtung:** Mehr Licht verwenden
- **Entfernung:** Näher heran oder weiter weg gehen
- **Sauberkeit:** QR-Code und Kamera-Linse reinigen
- **Beschädigung:** Neuen QR-Code drucken wenn beschädigt

### Seite lädt nicht
- **Internet:** WLAN/Mobilverbindung prüfen
- **URL:** Korrekte Adresse der Anwendung verwenden
- **Browser:** Andere Browser-App versuchen

### Daten werden nicht gespeichert
- **Berechtigung:** Browser-Speicher-Berechtigung prüfen
- **Speicher:** Ausreichend Speicherplatz verfügbar
- **Session:** Seite neu laden und erneut versuchen

---

## 📞 Support

Bei Problemen oder Fragen wenden Sie sich an:
- **Dokumentation:** Diese Anleitung durchlesen
- **System-Administrator:** Für technische Probleme
- **Benutzerhandbuch:** Weitere Funktionen der Anwendung

---

## 🔄 Updates und Erweiterungen

### Geplante Verbesserungen
- Offline-Funktionalität für Bereiche ohne Internet
- Barcode-Scanner für Produktidentifikation
- Historische Daten und Trends
- Export-Funktionen für Berichte

### Version
- **Erstellt:** September 2025
- **Version:** 1.0
- **Letztes Update:** 7. September 2025

---

*Diese Anleitung wird regelmäßig aktualisiert. Behalten Sie die neueste Version im Auge.*
