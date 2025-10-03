# 🔧 MazerationsMeister - Technische Dokumentation

> **Ausführliche technische Referenz für Entwickler, System-Administratoren und Power-User**

---

## 📑 Inhaltsverzeichnis

1. [System-Architektur](#system-architektur)
2. [Technologie-Stack](#technologie-stack)
3. [Datenmodell & Schema](#datenmodell--schema)
4. [API-Dokumentation](#api-dokumentation)
5. [Installation & Setup](#installation--setup)
6. [Build & Deployment](#build--deployment)
7. [Sicherheitsarchitektur](#sicherheitsarchitektur)
8. [Performance-Optimierung](#performance-optimierung)
9. [Troubleshooting](#troubleshooting)
10. [Entwickler-Guide](#entwickler-guide)

---

## 1. System-Architektur

### 1.1 Überblick

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop Application                       │
│                      (Electron Shell)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │   Next.js Frontend │◄───────►│  Electron Main     │     │
│  │   (React 18)       │         │  Process           │     │
│  └────────────────────┘         └────────────────────┘     │
│           │                              │                  │
│           │                              │                  │
│           ▼                              ▼                  │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │   Hybrid Storage   │         │  File System       │     │
│  │   (LocalStorage +  │◄───────►│  (OneDrive)        │     │
│  │    Electron IPC)   │         │                    │     │
│  └────────────────────┘         └────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Server (Port 9003)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Access Layer                       │
│                      (GitHub Pages)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │   login.html       │────────►│   auth-config.js   │     │
│  │   (PIN Entry)      │         │   (SHA-256)        │     │
│  └────────────────────┘         └────────────────────┘     │
│           │                              │                  │
│           │ Session Token                │                  │
│           ▼                              ▼                  │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │ tank-viewer-       │────────►│  Hybrid Storage    │     │
│  │ secure.html        │         │  API               │     │
│  └────────────────────┘         └────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Komponenten-Architektur

#### Frontend (Next.js)
- **Framework**: Next.js 15.4.2 (App Router)
- **Rendering**: Static Site Generation (SSG)
- **State Management**: React Hooks (useState, useEffect)
- **Routing**: File-based Routing (`src/app/`)

#### Backend (Electron)
- **Main Process**: Node.js-basiert (`electron/main.ts`)
- **IPC Communication**: Bidirektional via `ipcMain`/`ipcRenderer`
- **Preload Script**: Context Bridge für sichere API-Exposition

#### Storage Layer
- **Primary**: LocalStorage (Browser)
- **Secondary**: Electron IPC → File System
- **Tertiary**: OneDrive (optional, manuell)

---

## 2. Technologie-Stack

### 2.1 Frontend-Technologien

| Kategorie | Technologie | Version | Zweck |
|-----------|-------------|---------|-------|
| **Framework** | Next.js | 15.4.2 | SSG, Routing, Build |
| **UI Library** | React | 18.3.1 | Component-basierte UI |
| **Styling** | Tailwind CSS | 3.4.1 | Utility-first CSS |
| **UI Components** | shadcn/ui | Latest | Pre-built Components |
| **Icons** | Lucide React | 0.462.0 | Icon Library |
| **Charts** | Recharts | 2.13.3 | Datenvisualisierung |
| **QR-Codes** | qrcode.react | 4.1.0 | QR-Code-Generierung |
| **Forms** | React Hook Form | 7.54.2 | Formular-Validierung |
| **Date Handling** | date-fns | 4.1.0 | Datum-Utilities |

### 2.2 Backend-Technologien

| Kategorie | Technologie | Version | Zweck |
|-----------|-------------|---------|-------|
| **Runtime** | Electron | 36.7.1 | Desktop-App-Wrapper |
| **Build Tool** | electron-builder | 25.1.8 | Packaging & Distribution |
| **TypeScript** | TypeScript | 5.3.3 | Type-safe Development |
| **Node.js** | Node.js | 22.x | JavaScript Runtime |

### 2.3 Entwickler-Tools

| Tool | Version | Zweck |
|------|---------|-------|
| **ESLint** | 8.x | Code-Linting |
| **Prettier** | 3.x | Code-Formatting |
| **Git** | 2.x | Versionskontrolle |
| **VS Code** | Latest | IDE |

---

## 3. Datenmodell & Schema

### 3.1 Tank-Datenstruktur

```typescript
interface Tank {
  tankId: string;              // Eindeutige ID (z.B. "T 341")
  capacity: number;             // Kapazität in Litern
  currentFill: number;          // Aktueller Füllstand in Litern
  category?: 'Mazerat' | 'Destillat'; // Kategorie
  sorte?: string;               // Sorte (z.B. "Brombeere")
  charge?: string;              // Charge-Nummer (z.B. "MB-2025-001")
  alkoholgehalt?: number;       // % vol.
  createdAt: string;            // ISO 8601 Timestamp
  updatedAt: string;            // ISO 8601 Timestamp
  history: TankHistoryEntry[];  // Array von Historie-Einträgen
}

interface TankHistoryEntry {
  id: string;                   // UUID
  timestamp: string;            // ISO 8601
  type: 'fill' | 'empty' | 'reset'; // Aktionstyp
  amount: number;               // Menge in Litern
  previousFill: number;         // Füllstand vorher
  newFill: number;              // Füllstand nachher
  charge?: string;              // Charge (bei Befüllung)
  source?: string;              // Quelle/Ziel
  notes?: string;               // Notizen
  userId?: string;              // Benutzer-ID (zukünftig)
}
```

### 3.2 Inventar-Datenstruktur

```typescript
interface InventoryItem {
  id: string;                   // UUID
  name: string;                 // Produktname
  category: 'Mazerat' | 'Destillat' | 'Rohstoff' | 'Sonstiges';
  sorte?: string;               // Sorte
  charge?: string;              // Charge-Nummer
  menge: number;                // Menge in Einheit
  einheit: 'L' | 'kg' | 'Stück'; // Einheit
  mindestbestand?: number;      // Mindestbestand-Warnung
  lagerort?: string;            // Lagerort
  alkoholgehalt?: number;       // % vol.
  createdAt: string;            // Erstellt am
  updatedAt: string;            // Zuletzt geändert
  history: InventoryHistoryEntry[]; // Historie
}

interface InventoryHistoryEntry {
  id: string;                   // UUID
  timestamp: string;            // ISO 8601
  type: 'eingang' | 'ausgang' | 'korrektur'; // Bewegungstyp
  amount: number;               // Menge
  previousAmount: number;       // Bestand vorher
  newAmount: number;            // Bestand nachher
  reason?: string;              // Grund (z.B. "Produktion", "Verkauf")
  notes?: string;               // Notizen
}
```

### 3.3 Mazerations-Datenstruktur

```typescript
interface Mazeration {
  id: string;                   // UUID
  name: string;                 // Name des Prozesses
  sorte: string;                // Sorte (z.B. "Brombeere")
  charge: string;               // Charge-Nummer
  startDate: string;            // Startdatum (ISO 8601)
  endDate: string;              // Enddatum (ISO 8601)
  status: 'geplant' | 'aktiv' | 'abgeschlossen' | 'abgebrochen';
  tankId?: string;              // Verknüpfter Tank
  menge: number;                // Menge in Litern
  alkoholgehalt: number;        // % vol.
  temperatur?: number;          // °C
  parameters: {                 // Prozess-Parameter
    [key: string]: any;
  };
  notes?: string;               // Notizen
  createdAt: string;
  updatedAt: string;
  history: MazerationHistoryEntry[]; // Historie
}

interface MazerationHistoryEntry {
  id: string;
  timestamp: string;
  type: 'created' | 'started' | 'updated' | 'completed' | 'cancelled';
  changes?: {                   // Geänderte Felder
    [key: string]: { old: any; new: any };
  };
  notes?: string;
}
```

### 3.4 Auth-Datenstruktur

```typescript
interface AuthConfig {
  admin: {
    pin: string;                // 5-stellig (00369)
    validityDays: number;       // 365000 (permanent)
  };
  guest: {
    pin: string;                // 5-stellig (78963)
    validityHours: number;      // 24
  };
}

interface HashedPINs {
  admin: string;                // SHA-256 Hash
  guest: string;                // SHA-256 Hash
}

interface SessionToken {
  token: string;                // Base64-encoded
  role: 'admin' | 'guest';
  expiry: string;               // ISO 8601 Timestamp
  created: string;              // ISO 8601 Timestamp
}
```

### 3.5 Storage-Struktur

#### LocalStorage Keys

```javascript
// Daten-Keys
'tank-data'           // JSON-String mit Tank-Array
'inventory-data'      // JSON-String mit Inventar-Array
'mazeration-data'     // JSON-String mit Mazerations-Array

// Auth-Keys
'auth_token'          // Base64 Session-Token
'auth_role'           // 'admin' | 'guest'
'auth_expiry'         // ISO 8601 Timestamp

// Settings-Keys
'app_settings'        // JSON mit Einstellungen
'onedrive_config'     // OneDrive-Konfiguration
```

#### File System (OneDrive)

```
C:\Users\[Username]\OneDrive\MazerationsMeister\
├── tanks\
│   ├── tank-T341.json
│   ├── tank-T342.json
│   └── ...
├── chargen\
│   ├── MB-2025-001.json
│   └── ...
├── backup\
│   ├── tank-T341_2025-10-02T10-30-00.json
│   └── inventory-backup-2025-10-02.json
└── exports\
    ├── inventory-export-2025-10-02.xlsx
    └── tank-report-2025-10-02.pdf
```

---

## 4. API-Dokumentation

### 4.1 Hybrid Storage API

#### `hybridStorage.getTankData()`
Lädt alle Tank-Daten aus LocalStorage oder Electron IPC.

**Return**: `Promise<Tank[]>`

```typescript
const tanks = await hybridStorage.getTankData();
console.log(tanks); // Array von Tank-Objekten
```

#### `hybridStorage.saveTankData(tanks: Tank[])`
Speichert Tank-Daten in LocalStorage und optional in File System.

**Parameters**:
- `tanks`: Array von Tank-Objekten

**Return**: `Promise<void>`

```typescript
await hybridStorage.saveTankData(updatedTanks);
```

#### `hybridStorage.getInventoryData()`
Lädt Inventar-Daten.

**Return**: `Promise<InventoryItem[]>`

#### `hybridStorage.saveInventoryData(items: InventoryItem[])`
Speichert Inventar-Daten.

**Parameters**:
- `items`: Array von InventoryItem-Objekten

**Return**: `Promise<void>`

### 4.2 Auth API

#### `checkAuth(): boolean`
Prüft, ob eine gültige Session existiert.

**Return**: `boolean` - `true` wenn gültige Session

```typescript
if (!checkAuth()) {
  window.location.href = '/login.html';
}
```

#### `login(pin: string): Promise<LoginResult>`
Führt PIN-Login durch und erstellt Session.

**Parameters**:
- `pin`: 5-stelliger PIN-Code

**Return**: `Promise<{ success: boolean; role?: 'admin' | 'guest'; error?: string }>`

```typescript
const result = await login('00369');
if (result.success) {
  console.log(`Logged in as ${result.role}`);
}
```

#### `logout(): void`
Löscht Session und LocalStorage-Auth-Keys.

```typescript
logout();
window.location.href = '/login.html';
```

#### `generateToken(role: 'admin' | 'guest'): string`
Generiert Base64-kodierten Session-Token.

**Parameters**:
- `role`: Benutzerrolle

**Return**: `string` - Base64 Token

### 4.3 QR-Code API

#### `generateQRCode(url: string, options?: QRCodeOptions): Promise<string>`
Generiert QR-Code als Data-URL.

**Parameters**:
- `url`: Target-URL
- `options`: Optionale QR-Code-Einstellungen

**Return**: `Promise<string>` - Data-URL (PNG)

```typescript
const qrDataUrl = await generateQRCode(
  'https://example.com/tank-viewer?tank=T341',
  { width: 300, margin: 2 }
);
```

---

## 5. Installation & Setup

### 5.1 Entwickler-Setup

#### Voraussetzungen
- **Node.js**: >= 22.x
- **npm**: >= 10.x
- **Git**: >= 2.x
- **Windows**: 10/11 (für Electron-Build)

#### Repository klonen
```bash
git clone https://github.com/woku369/MazerationsMeister.git
cd MazerationsMeister
```

#### Dependencies installieren
```bash
npm install
```

#### Entwicklungs-Server starten
```bash
npm run dev
```

**URL**: http://localhost:3000

#### Electron-App starten
```bash
npm run electron:dev
```

oder direkt:

```bash
npx electron .
```

### 5.2 Produktions-Build

#### Next.js Build (Web)
```bash
npm run build
```

Output: `./out/` (statische Files)

#### Electron Build (Desktop)
```bash
npm run build:electron
```

Output: `./dist/` (Windows Executable)

#### Optimierter Build
```bash
node scripts/build-optimized.js
```

Output: `./dist-optimized/`

### 5.3 GitHub Pages Deployment

#### Automatisch (via Git Push)
```bash
git add .
git commit -m "Deploy"
git push origin main-pages
```

GitHub Actions deployed automatisch nach: `https://woku369.github.io/MazerationsMeister`

#### Manuell
```bash
npm run build
# Upload ./out/ Ordner zu GitHub Pages
```

---

## 6. Build & Deployment

### 6.1 Build-Scripts

#### `npm run build`
Standard Next.js Build für statisches Hosting.

**Output**: `./out/`

**Verwendung**: GitHub Pages, statische Hosts

#### `npm run electron:build`
Electron-App für Windows bauen.

**Output**: `./dist/MazerationsMeister-win32-x64/`

**Verwendung**: Desktop-Distribution

#### Custom Scripts

**build-optimized.js**
```javascript
// Reduzierte Größe, optimierte Performance
node scripts/build-optimized.js
```

**build-ultra-minimal.js**
```javascript
// Minimale Größe (~30 MB)
node scripts/build-ultra-minimal.js
```

### 6.2 Deployment-Workflows

#### Desktop (Electron)
1. Build: `npm run electron:build`
2. Test: Executable in `./dist/` öffnen
3. Package: ZIP erstellen
4. Release: GitHub Release mit Executable

#### Web (GitHub Pages)
1. Build: `npm run build`
2. Commit: `git add out/ && git commit`
3. Push: `git push origin main-pages`
4. Deploy: Automatisch via GitHub Actions

#### OneDrive (QR-Codes)
1. Statische HTML in `./public/` erstellen
2. Upload zu OneDrive-Ordner
3. Freigabe-Link generieren
4. QR-Code mit Link erstellen

### 6.3 Environment-Variablen

**`.env.local`** (Development)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_PORT=9003
NEXT_PUBLIC_ELECTRON_MODE=true
```

**Production**
```env
NEXT_PUBLIC_APP_URL=https://woku369.github.io/MazerationsMeister
NEXT_PUBLIC_ELECTRON_MODE=false
```

---

## 7. Sicherheitsarchitektur

### 7.1 PIN-Authentifizierung

#### Hash-Generierung
```javascript
const crypto = require('crypto');

function hashPIN(pin) {
  return crypto.createHash('sha256')
    .update(pin)
    .digest('hex');
}

// Admin PIN (00369)
const adminHash = hashPIN('00369');
// dd872e77ef3f72cfcc3cb178a18337e9ec6d1b94ee593e418a708ca2ab6b9a0e

// Guest PIN (78963)
const guestHash = hashPIN('78963');
// eec8d53877f6a527a2c227272cc42ae50ea691c2f5a53c37e121af04c12b7fff
```

#### Session-Token

**Struktur**:
```json
{
  "role": "admin",
  "timestamp": "2025-10-02T10:30:00Z",
  "random": "a1b2c3d4e5f6"
}
```

**Encoding**: Base64

**Speicherung**: LocalStorage (`auth_token`)

**Validierung**:
```javascript
function validateSession() {
  const token = localStorage.getItem('auth_token');
  const expiry = localStorage.getItem('auth_expiry');
  const role = localStorage.getItem('auth_role');
  
  if (!token || !expiry || !role) return false;
  
  const expiryDate = new Date(expiry);
  const now = new Date();
  
  return now < expiryDate;
}
```

### 7.2 DSGVO-Compliance

#### Datenminimierung
- Keine IP-Adressen gespeichert
- Keine persönlichen Daten außer User-ID (optional)
- Keine Tracking-Cookies

#### Speicherorte
- **LocalStorage**: Nur funktionale Daten (Tanks, Inventar)
- **OneDrive**: Optionales Backup (Nutzer-kontrolliert)
- **Keine Cloud**: Keine automatischen Uploads

#### Zugriffskontrolle
- PIN-geschützt (SHA-256)
- Session-basiert (zeitlich begrenzt)
- Logout-Funktion (Daten bleiben, Session gelöscht)

#### Audit-Trail
Alle Änderungen werden protokolliert:
```typescript
interface AuditLog {
  timestamp: string;
  action: string;
  userId?: string;
  details: any;
}
```

### 7.3 XSS & Injection Protection

#### Input Sanitization
```typescript
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
```

#### SQL Injection
**Nicht relevant** - Keine SQL-Datenbank, nur JSON-Storage

#### CSP (Content Security Policy)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

---

## 8. Performance-Optimierung

### 8.1 Frontend-Optimierung

#### Code-Splitting
```typescript
// Dynamic Imports für große Komponenten
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});
```

#### Lazy Loading
```typescript
// Bilder lazy loaden
<img 
  src={imageSrc} 
  loading="lazy" 
  alt="Description" 
/>
```

#### Memoization
```typescript
// Teure Berechnungen cachen
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### 8.2 Storage-Optimierung

#### LocalStorage-Limits
- **Max Size**: ~5-10 MB (browserspezifisch)
- **Compression**: JSON.stringify mit Minification

#### Batching
```typescript
// Mehrere Updates zusammenfassen
let updateQueue = [];
let updateTimeout;

function queueUpdate(data) {
  updateQueue.push(data);
  clearTimeout(updateTimeout);
  
  updateTimeout = setTimeout(() => {
    batchSave(updateQueue);
    updateQueue = [];
  }, 500);
}
```

### 8.3 Electron-Optimierung

#### Prozess-Isolation
```typescript
// Renderer Process: Nur UI
// Main Process: File I/O, Netzwerk

// IPC Communication minimieren
ipcRenderer.invoke('bulk-operation', operations);
```

#### Memory Management
```typescript
// Große Daten-Arrays bereinigen
function cleanup() {
  if (largeDataArray.length > 1000) {
    largeDataArray = largeDataArray.slice(-1000);
  }
}
```

### 8.4 Benchmarks

| Operation | Durchschnitt | 95% Perzentil |
|-----------|--------------|---------------|
| App-Start (Electron) | 2.5s | 3.2s |
| Page-Reload | 0.8s | 1.2s |
| Tank-Daten laden (50 Tanks) | 120ms | 180ms |
| QR-Code generieren | 85ms | 150ms |
| LocalStorage save | 25ms | 50ms |
| File System save | 150ms | 300ms |

---

## 9. Troubleshooting

### 9.1 Häufige Probleme

#### Problem: "App startet nicht"
**Symptom**: Electron-App öffnet sich nicht.

**Lösung**:
1. Prüfe Windows Defender / Antivirus
2. Führe als Administrator aus
3. Neuinstallation:
   ```bash
   rm -rf node_modules
   npm install
   npm run electron:build
   ```

#### Problem: "QR-Code wird nicht geladen"
**Symptom**: QR-Code zeigt "Loading..." permanent.

**Lösung**:
1. Prüfe Netzwerk-Verbindung (WLAN)
2. Prüfe Firewall-Regeln für Port 9003
3. IP-Adresse prüfen:
   ```bash
   ipconfig
   # Nutze IPv4-Adresse (z.B. 192.168.0.7)
   ```

#### Problem: "PIN wird nicht akzeptiert"
**Symptom**: Login-Fehler trotz korrekter PIN.

**Lösung**:
1. Browser-Cache löschen
2. LocalStorage leeren:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
3. PIN-Hash prüfen:
   ```javascript
   node generate-pin-hashes.js
   ```

#### Problem: "Daten gehen verloren"
**Symptom**: Gespeicherte Daten verschwinden nach Neustart.

**Lösung**:
1. OneDrive-Backup aktivieren
2. Manueller Export:
   ```javascript
   const data = localStorage.getItem('tank-data');
   // Download als JSON
   ```
3. Prüfe Browser-Privacy-Settings (Inkognito-Modus löscht LocalStorage)

### 9.2 Debug-Tools

#### Electron DevTools
```bash
# F12 oder Ctrl+Shift+I in Electron-App
```

#### Console-Logging
```typescript
// In hybridStorage
console.log('[Storage] Save:', data);
console.log('[Storage] Load:', result);
```

#### Network-Monitoring
```bash
# Chrome DevTools → Network Tab
# Prüfe QR-Code-Requests
```

### 9.3 Log-Files

#### Electron Logs
**Windows**: `%APPDATA%\MazerationsMeister\logs\`

**Format**:
```
[2025-10-02 10:30:45] INFO: App started
[2025-10-02 10:30:46] DEBUG: Loading tank data
[2025-10-02 10:30:47] ERROR: Failed to connect to OneDrive
```

#### Browser Console Logs
```javascript
// Export console logs
console.save = function(data, filename) {
  const blob = new Blob([data], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};
```

---

## 10. Entwickler-Guide

### 10.1 Code-Konventionen

#### TypeScript
```typescript
// ✅ Guter Code
interface TankProps {
  tankId: string;
  capacity: number;
}

function TankComponent({ tankId, capacity }: TankProps) {
  return <div>Tank {tankId}: {capacity}L</div>;
}

// ❌ Schlechter Code
function TankComponent(props: any) {
  return <div>{props.tankId}</div>;
}
```

#### Naming
- **Komponenten**: PascalCase (`TankManagement.tsx`)
- **Funktionen**: camelCase (`getTankData()`)
- **Konstanten**: UPPER_SNAKE_CASE (`MAX_CAPACITY`)
- **Interfaces**: PascalCase mit `I` Prefix optional (`Tank` oder `ITank`)

#### File Structure
```
src/
├── app/                    # Next.js Pages (App Router)
│   ├── page.tsx           # Homepage
│   ├── layout.tsx         # Root Layout
│   └── [feature]/         # Feature-spezifische Pages
├── components/            # React Components
│   ├── ui/               # shadcn/ui Components
│   └── [feature]/        # Feature-spezifische Components
├── lib/                  # Utilities & Helpers
│   ├── utils.ts
│   └── storage.ts
├── types/                # TypeScript Types
│   └── index.ts
└── hooks/                # Custom React Hooks
    └── useTankData.ts
```

### 10.2 Testing

#### Unit Tests (Jest)
```typescript
// tank-management.test.ts
import { getTankData } from '@/lib/storage';

describe('getTankData', () => {
  it('should load tank data from localStorage', async () => {
    const tanks = await getTankData();
    expect(tanks).toBeInstanceOf(Array);
  });
});
```

#### E2E Tests (Playwright)
```typescript
// e2e/tank-management.spec.ts
test('should add new tank', async ({ page }) => {
  await page.goto('/inventory');
  await page.click('button:has-text("Tank hinzufügen")');
  await page.fill('input[name="tankId"]', 'T 999');
  await page.click('button:has-text("Speichern")');
  
  await expect(page.locator('text=T 999')).toBeVisible();
});
```

### 10.3 Git-Workflow

#### Branch-Strategie
```bash
main              # Produktions-Code
├── main-pages    # GitHub Pages Deployment
├── develop       # Entwicklungs-Branch
└── feature/xyz   # Feature-Branches
```

#### Commit-Messages
```bash
# Format: <type>(<scope>): <subject>

feat(tanks): add QR-code generation
fix(auth): resolve PIN validation bug
docs(readme): update installation guide
style(ui): improve button styling
refactor(storage): optimize data loading
test(inventory): add unit tests
chore(deps): update dependencies
```

#### Pull-Request-Template
```markdown
## Beschreibung
[Beschreibe die Änderungen]

## Typ
- [ ] Bugfix
- [ ] Feature
- [ ] Breaking Change
- [ ] Dokumentation

## Checklist
- [ ] Tests hinzugefügt
- [ ] Dokumentation aktualisiert
- [ ] Code gelintet
- [ ] Build erfolgreich
```

### 10.4 Continuous Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main-pages ]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./out
```

---

## 📚 Anhang

### A. Glossar

| Begriff | Definition |
|---------|------------|
| **Mazeration** | Extraktion von Aromen durch Einlegen in Alkohol |
| **Destillation** | Trennung von Flüssigkeiten durch Verdampfung |
| **Charge** | Produktions-Los mit eindeutiger Nummer |
| **Gebinde** | Container (Tank, Fass, Kanister) |
| **IPC** | Inter-Process Communication (Electron) |
| **SSG** | Static Site Generation (Next.js) |
| **SHA-256** | Kryptographische Hash-Funktion |

### B. Abkürzungen

| Abkürzung | Bedeutung |
|-----------|-----------|
| **API** | Application Programming Interface |
| **CRUD** | Create, Read, Update, Delete |
| **CSV** | Comma-Separated Values |
| **DSGVO** | Datenschutz-Grundverordnung |
| **IPC** | Inter-Process Communication |
| **JSON** | JavaScript Object Notation |
| **PIN** | Personal Identification Number |
| **QR** | Quick Response (Code) |
| **ROI** | Return on Investment |
| **SSG** | Static Site Generation |
| **UI** | User Interface |
| **UUID** | Universally Unique Identifier |

### C. Externe Ressourcen

- **Electron Docs**: https://electronjs.org/docs
- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com

---

*Letzte Aktualisierung: 2. Oktober 2025*  
*Version: 1.0*  
*Sprache: Deutsch*
