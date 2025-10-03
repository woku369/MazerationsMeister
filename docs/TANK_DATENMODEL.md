# Tank-Datenmodel für dynamische Inhalte

## Konzept: Trennung Tank vs. Inhalt

### Tank-Stammdaten (statisch)
```json
{
  "tankId": "tank-t341",
  "tankNr": "T 341", 
  "bezeichnung": "Edelstahltank 6000L",
  "kapazitaet": 6000,
  "standort": "Tankraum A, Position 3",
  "qrCode": "PERMANENT_QR_T341"
}
```

### Tank-Inhalte (dynamisch)
```json
{
  "tankId": "tank-t341",
  "aktualisiert": "2025-09-08T22:00:00Z",
  "gesamtfuellstand": 4200,
  "chargen": [
    {
      "chargeId": "MB-2025-001",
      "sorte": "Marillenbrand Mazerat",
      "menge": 2400,
      "eingefuellt": "2025-03-15",
      "alkoholgehalt": 42.5,
      "qualitaetsklasse": "Premium"
    },
    {
      "chargeId": "MB-2025-002", 
      "sorte": "Marillenbrand Mazerat",
      "menge": 1800,
      "eingefuellt": "2025-05-20",
      "alkoholgehalt": 42.8,
      "qualitaetsklasse": "Premium"
    }
  ],
  "temperatur": 18.5,
  "ph_wert": 3.2,
  "letzteKontrolle": "2025-09-07",
  "naechsteKontrolle": "2025-09-15"
}
```

### Befüllungs-Historie
```json
{
  "tankId": "tank-t341",
  "verlauf": [
    {
      "datum": "2024-12-10",
      "aktion": "entleert",
      "vorherigeSorte": "Birnenbrand Mazerat",
      "menge": 5200
    },
    {
      "datum": "2025-01-05", 
      "aktion": "gereinigt",
      "verantwortlicher": "W. Gruber"
    },
    {
      "datum": "2025-03-15",
      "aktion": "befuellt",
      "charge": "MB-2025-001",
      "menge": 2400
    }
  ]
}
```

## OneDrive-Integration ohne Azure

### Option 1: Direkte OneDrive-Ordner-Sync
```
OneDrive/MazerationsMeister/
├── tanks/
│   ├── tank-t341.json
│   ├── tank-t342.json
│   └── tank-t343.json
├── chargen/
│   ├── MB-2025-001.json
│   └── MB-2025-002.json
└── sync-status.json
```

### Option 2: Lokaler OneDrive-Ordner
- App schreibt in lokalen OneDrive-Ordner
- OneDrive-Client synchronisiert automatisch
- **Keine Azure-Registrierung nötig!**

### Option 3: JSON-Export für Cloud
```javascript
// Automatischer Export alle 30 Minuten
function exportToOneDrive() {
  const tankData = getAllTankData();
  const fileName = `tanks-${new Date().toISOString().split('T')[0]}.json`;
  const oneDrivePath = 'C:/Users/wolfg/OneDrive/MazerationsMeister/';
  
  fs.writeFileSync(oneDrivePath + fileName, JSON.stringify(tankData, null, 2));
}
```

## QR-Code-Strategie

### Statischer QR-Code pro Tank
```
QR-Code Inhalt: tank-t341
```

### Dynamische URL-Auflösung
```
https://app.mazerations-meister.local/tank/t341
├── Online: Zeigt Live-Daten
└── Offline: Zeigt letzte Sync-Daten aus OneDrive
```

### Offline-Funktionalität
```javascript
// Offline-Seite lädt Daten aus OneDrive-JSON
async function loadTankFromCloud(tankId) {
  try {
    const response = await fetch(`/onedrive-data/tank-${tankId}.json`);
    const data = await response.json();
    displayTankContents(data);
  } catch (error) {
    showOfflineFallback(tankId);
  }
}
```
