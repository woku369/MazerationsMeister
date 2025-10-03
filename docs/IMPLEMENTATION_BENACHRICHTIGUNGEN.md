# 🔔 Implementierung: Benachrichtigungen & Erinnerungen

> **Detaillierte Implementierungs-Planung für das Notification-System**

---

## 📋 Übersicht

**Priorität**: 🔥 P0 (Höchste Priorität)  
**Geschätzter Aufwand**: 2 Wochen  
**Ziel-Release**: v1.1 (November 2025)  
**Status**: 🟡 Geplant

---

## 🎯 Ziele

### Primäre Ziele
1. ✅ **Mazeration-Erinnerungen**: Automatische Benachrichtigungen bei Prozess-Ende
2. ✅ **Mindestbestand-Warnungen**: Alarm bei unterschrittenem Mindestbestand
3. ✅ **Qualitätsprüfungen**: Erinnerungen für fällige QC-Checks
4. ✅ **Notification-Center**: Zentrale Inbox für alle Benachrichtigungen

### Sekundäre Ziele
5. ✅ **Push-Notifications**: Browser-basierte Push-Benachrichtigungen (optional)
6. ✅ **Dashboard-Widget**: Notification-Badge im Dashboard
7. ✅ **Settings**: Benutzer kann Benachrichtigungen konfigurieren

---

## 🏗️ Architektur

### Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                 Notification System                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │ Notification     │────────►│  Notification    │     │
│  │ Service          │         │  Store           │     │
│  │ (Business Logic) │         │  (LocalStorage)  │     │
│  └──────────────────┘         └──────────────────┘     │
│           │                            │                │
│           │                            │                │
│           ▼                            ▼                │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │ Notification     │         │  Browser Push    │     │
│  │ UI Components    │         │  API             │     │
│  └──────────────────┘         └──────────────────┘     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Datenmodell

```typescript
// Notification Type
type NotificationType = 
  | 'mazeration-ready'      // Mazeration fertig
  | 'mazeration-overdue'    // Mazeration überfällig
  | 'inventory-low'         // Mindestbestand unterschritten
  | 'inventory-critical'    // Kritischer Bestand (< 5%)
  | 'qc-due'                // Qualitätsprüfung fällig
  | 'qc-overdue'            // QC überfällig
  | 'tank-full'             // Tank voll
  | 'tank-empty'            // Tank leer
  | 'custom';               // Benutzerdefiniert

// Notification Priority
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Notification Interface
interface Notification {
  id: string;                       // UUID
  type: NotificationType;           // Typ
  priority: NotificationPriority;   // Priorität
  title: string;                    // Titel (kurz)
  message: string;                  // Nachricht (lang)
  timestamp: string;                // ISO 8601
  read: boolean;                    // Gelesen?
  acknowledged: boolean;            // Bestätigt?
  actionUrl?: string;               // Link zur Detailseite
  relatedEntity?: {                 // Verknüpfte Entität
    type: 'mazeration' | 'inventory' | 'tank' | 'qc';
    id: string;
    name: string;
  };
  metadata?: {                      // Zusätzliche Daten
    [key: string]: any;
  };
}

// Notification Settings
interface NotificationSettings {
  enabled: boolean;                 // Generell aktiviert?
  pushEnabled: boolean;             // Push-Notifications?
  types: {                          // Pro Typ aktivierbar
    [K in NotificationType]: {
      enabled: boolean;
      priority: NotificationPriority;
      advance: number;              // X Tage/Stunden vorher
    };
  };
  quietHours: {                     // Ruhezeiten
    enabled: boolean;
    start: string;                  // HH:MM
    end: string;                    // HH:MM
  };
}
```

---

## 📁 Datei-Struktur

### Neue Dateien

```
src/
├── lib/
│   ├── notification-service.ts      # Core Logic
│   ├── notification-store.ts        # LocalStorage Wrapper
│   └── notification-checker.ts      # Background Checker
├── components/
│   ├── notifications/
│   │   ├── notification-center.tsx  # Dropdown-Inbox
│   │   ├── notification-item.tsx    # Einzelne Notification
│   │   ├── notification-badge.tsx   # Badge mit Anzahl
│   │   └── notification-settings.tsx # Settings-Seite
│   └── dashboard/
│       └── notification-widget.tsx  # Dashboard-Widget
└── app/
    └── benachrichtigungen/
        └── page.tsx                 # Vollständige Notification-Liste
```

---

## 🔧 Implementation Plan

### **WOCHE 1: Core System**

#### Tag 1-2: Datenmodell & Service
- [x] TypeScript Interfaces definieren
- [ ] `notification-store.ts` implementieren
  - `getNotifications(): Notification[]`
  - `addNotification(notification: Notification): void`
  - `markAsRead(id: string): void`
  - `markAsAcknowledged(id: string): void`
  - `deleteNotification(id: string): void`
  - `clearAll(): void`
- [ ] `notification-service.ts` implementieren
  - `createNotification(type, data): Notification`
  - `getUnreadCount(): number`
  - `getByPriority(priority): Notification[]`
  - `getByType(type): Notification[]`

#### Tag 3-4: Background Checker
- [ ] `notification-checker.ts` implementieren
  - Interval-basiert (alle 5 Minuten)
  - Prüft Mazerationen auf Ende/Überfälligkeit
  - Prüft Inventar auf Mindestbestand
  - Erstellt Notifications automatisch
- [ ] Integration in `app/layout.tsx` (useEffect Hook)

#### Tag 5: UI Components (Basis)
- [ ] `notification-badge.tsx` 
  - Bell-Icon mit rotem Badge (Anzahl ungelesen)
  - Klick öffnet Notification-Center
- [ ] `notification-item.tsx`
  - Title, Message, Timestamp
  - Read/Unread State (bold vs. normal)
  - "Als gelesen markieren", "Löschen"
  - Link zur Detail-Seite (falls vorhanden)

---

### **WOCHE 2: UI & Features**

#### Tag 6-7: Notification Center
- [ ] `notification-center.tsx` (Dropdown)
  - Slide-in von rechts (oder Dropdown vom Bell-Icon)
  - Liste aller Notifications (max. 50)
  - Filter: Alle | Ungelesen | Nach Typ
  - "Alle als gelesen markieren"
  - "Alle löschen" (mit Bestätigung)
  - Scroll-to-load (Lazy Loading)

#### Tag 8: Dashboard-Widget
- [ ] `notification-widget.tsx`
  - Zeigt Top 5 wichtigste Notifications
  - Priorisierung: Urgent > High > Medium
  - "Alle anzeigen"-Link zu `/benachrichtigungen`

#### Tag 9: Benachrichtigungen-Seite
- [ ] `/benachrichtigungen/page.tsx`
  - Vollständige Liste (nicht nur Top 5)
  - Filtermöglichkeiten (Typ, Priorität, Datum)
  - Suche
  - Export als CSV/PDF

#### Tag 10: Settings
- [ ] `notification-settings.tsx`
  - In `/einstellungen` einbinden
  - Toggle: Benachrichtigungen aktiviert?
  - Pro Typ: Aktiviert? Priorität? Vorlaufzeit?
  - Ruhezeiten konfigurieren
  - Push-Notifications aktivieren (falls Browser unterstützt)

---

### **Bonus (falls Zeit): Push-Notifications**

#### Tag 11 (optional):
- [ ] Browser Push API integrieren
  - `Notification.requestPermission()`
  - Service Worker für Push (PWA-Vorbereitung)
  - Notifications auch wenn Tab nicht aktiv

---

## 🎨 UI/UX Design

### Notification Badge
```tsx
// Header (z.B. in Sidebar oder Top-Bar)
<Button variant="ghost" size="icon" onClick={() => setShowNotifications(true)}>
  <Bell className="h-5 w-5" />
  {unreadCount > 0 && (
    <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
      {unreadCount}
    </span>
  )}
</Button>
```

### Notification Item
```tsx
<Card className={cn("mb-2", !notification.read && "border-blue-500")}>
  <CardContent className="flex items-start gap-3 p-4">
    {/* Icon based on type */}
    <div className={cn(
      "flex h-10 w-10 items-center justify-center rounded-full",
      priorityColors[notification.priority]
    )}>
      <AlertCircle className="h-5 w-5" />
    </div>
    
    {/* Content */}
    <div className="flex-1">
      <h4 className={cn("font-semibold", !notification.read && "font-bold")}>
        {notification.title}
      </h4>
      <p className="text-sm text-muted-foreground">{notification.message}</p>
      <p className="mt-1 text-xs text-gray-400">
        {formatDistanceToNow(new Date(notification.timestamp), { locale: de, addSuffix: true })}
      </p>
    </div>
    
    {/* Actions */}
    <div className="flex gap-2">
      {!notification.read && (
        <Button size="sm" variant="ghost" onClick={() => markAsRead(notification.id)}>
          <Check className="h-4 w-4" />
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => deleteNotification(notification.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </CardContent>
</Card>
```

### Priority Colors
```typescript
const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityIcons = {
  low: Info,
  medium: AlertCircle,
  high: AlertTriangle,
  urgent: AlertCircle, // mit Animation (pulse)
};
```

---

## 🧪 Testing

### Unit Tests
```typescript
// notification-service.test.ts
describe('NotificationService', () => {
  it('should create mazeration-ready notification', () => {
    const notification = createNotification('mazeration-ready', {
      mazerationName: 'Brombeere MB-2025-001',
      endDate: '2025-11-15T10:00:00Z'
    });
    
    expect(notification.type).toBe('mazeration-ready');
    expect(notification.priority).toBe('high');
    expect(notification.title).toContain('Brombeere');
  });
  
  it('should detect low inventory', () => {
    const item = { name: 'Brombeeren', menge: 5, mindestbestand: 10 };
    const notification = checkInventoryLevel(item);
    
    expect(notification.type).toBe('inventory-low');
    expect(notification.priority).toBe('medium');
  });
});
```

### Integration Tests
- [ ] Notification wird erstellt, wenn Mazeration-Enddatum erreicht
- [ ] Badge-Zahl aktualisiert sich bei neuer Notification
- [ ] "Als gelesen markieren" funktioniert
- [ ] Notifications bleiben nach Reload erhalten (LocalStorage)

### E2E Tests (Playwright)
```typescript
test('should show notification when mazeration is ready', async ({ page }) => {
  // Mazeration mit Enddatum = heute erstellen
  await page.goto('/mazerationen');
  await page.click('button:has-text("Neue Mazeration")');
  // ... fill form
  
  // Warten auf Notification
  await page.waitForSelector('[data-testid="notification-badge"]');
  const badge = await page.textContent('[data-testid="notification-badge"]');
  expect(badge).toBe('1');
  
  // Notification öffnen
  await page.click('[data-testid="notification-bell"]');
  await expect(page.locator('text=Mazeration fertig')).toBeVisible();
});
```

---

## 📊 Performance

### Optimierungen
1. **Background Checker**: Nur alle 5 Minuten laufen (nicht jede Sekunde)
2. **LocalStorage**: Max. 100 Notifications speichern (älteste automatisch löschen)
3. **Lazy Loading**: Notification-Center lädt nur 20 auf einmal, mehr per Scroll
4. **Debouncing**: Mehrere gleiche Notifications zusammenfassen (z.B. 5x "Mindestbestand unterschritten" → nur 1 Notification)

### Benchmarks
| Operation | Ziel | Akzeptabel |
|-----------|------|------------|
| Notification erstellen | < 10ms | < 50ms |
| Badge-Anzahl berechnen | < 5ms | < 20ms |
| Notification-Center öffnen | < 100ms | < 300ms |
| Background-Check | < 500ms | < 1000ms |

---

## 🚀 Rollout-Plan

### Phase 1: Soft Launch (v1.1-beta)
- [ ] Feature-Flag aktivieren (nur für dich)
- [ ] 1 Woche Testing im echten Betrieb
- [ ] Bugfixes & Usability-Verbesserungen

### Phase 2: Public Release (v1.1)
- [ ] Feature für alle User aktivieren
- [ ] Announcement in README
- [ ] Tutorial im Anleitungen-Bereich

### Phase 3: Erweiterungen (v1.2)
- [ ] Push-Notifications (Browser API)
- [ ] E-Mail-Benachrichtigungen (optional)
- [ ] Slack/Teams-Integration (optional)

---

## 📝 User Stories

### Story 1: Brennmeister vergisst nie mehr Mazerationen
**Als** Brennmeister  
**möchte ich** automatisch erinnert werden, wenn eine Mazeration fertig ist  
**damit** ich sie rechtzeitig destillieren kann und keine Qualitätsverluste entstehen.

**Acceptance Criteria**:
- ✅ 1 Tag vor Mazeration-Ende: Notification mit "medium" Priority
- ✅ Am Tag des Endes: Notification mit "high" Priority
- ✅ 1 Tag nach Ende (überfällig): Notification mit "urgent" Priority (rot, pulsierend)

---

### Story 2: Lagerarbeiter sieht sofort kritische Bestände
**Als** Lagerarbeiter  
**möchte ich** gewarnt werden, wenn Mindestbestände unterschritten werden  
**damit** ich rechtzeitig nachbestellen kann.

**Acceptance Criteria**:
- ✅ Bei Unterschreitung Mindestbestand: "medium" Notification
- ✅ Bei < 5% Restbestand: "high" Notification
- ✅ Bei 0% Restbestand: "urgent" Notification

---

### Story 3: Qualitätsleiter vergisst keine QC-Checks
**Als** Qualitätsleiter  
**möchte ich** an fällige Qualitätsprüfungen erinnert werden  
**damit** Compliance gewährleistet ist.

**Acceptance Criteria**:
- ✅ 3 Tage vor QC-Termin: "low" Notification
- ✅ Am QC-Termin: "high" Notification
- ✅ Nach QC-Termin (überfällig): "urgent" Notification

---

## 🐛 Known Issues / Limitations

### Limitations
1. **Nur Browser-basiert**: Keine Notifications wenn Browser geschlossen (→ Push-API in Phase 3)
2. **Keine E-Mail**: Nur In-App (→ E-Mail in v1.2)
3. **Keine Gruppierung**: Viele Notifications = lange Liste (→ Gruppierung in v1.2)

### Workarounds
- Browser offen lassen (Electron-App läuft im Hintergrund)
- Regelmäßig Notification-Center checken
- Dashboard-Widget zeigt wichtigste Notifications

---

## 📚 Dependencies

### Neue npm-Pakete
```json
{
  "date-fns": "^4.1.0",          // Bereits vorhanden (Datum-Formatierung)
  "lucide-react": "^0.462.0",    // Bereits vorhanden (Icons)
  "react-toastify": "^10.0.5"    // Optional: Toast-Notifications
}
```

### Keine zusätzlichen Dependencies nötig! ✅

---

## 🎉 Success Metrics

### KPIs (nach 1 Monat)
- [ ] **Adoption Rate**: > 80% der User haben Notifications aktiviert
- [ ] **Engagement**: > 50% der Notifications werden gelesen
- [ ] **Feedback**: > 4/5 Sterne in User-Feedback
- [ ] **Vergessene Mazerationen**: -90% (vorher: ~10%, nachher: ~1%)

### Metriken tracken
```typescript
// In notification-service.ts
const metrics = {
  created: 0,
  read: 0,
  acknowledged: 0,
  deleted: 0,
  avgTimeToRead: 0, // Minuten
};

// Export als JSON für Analyse
function exportMetrics() {
  return JSON.stringify(metrics);
}
```

---

## 📞 Kontakt & Fragen

Bei Fragen zur Implementation:
- **GitHub Issues**: https://github.com/woku369/MazerationsMeister/issues
- **E-Mail**: [Entwickler-Kontakt]

---

*Erstellt am: 2. Oktober 2025*  
*Version: 1.0*  
*Nächstes Review: Nach WOCHE 1 (Tag 5)*
