/**
 * Zentrale Datenmodelle für Single-File App-Sync
 * Alle App-Daten in einer JSON-Datei: docs/app-data.json
 */

import { Rezeptur } from '@/schemas/rezepturSchema';

// ============================================================================
// CALENDAR EVENTS
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO 8601
  tankId?: string;
  type: 'mazeration' | 'reminder' | 'maintenance' | 'task' | 'other';
  description?: string;
  completed: boolean;
  reminders?: CalendarReminder[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarReminder {
  offset: number; // Millisekunden vor Event
  sent: boolean;
  method: 'notification' | 'email' | 'both';
}

// ============================================================================
// TODO ITEMS
// ============================================================================

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  tankId?: string; // Optional: Verknüpfung mit Tank
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MAZERATION PROTOCOLS
// ============================================================================

export interface MazerationProtocol {
  id: string;
  tankId: string;
  product: string;
  productCategory?: 'Mazerat' | 'Destillat' | 'Selbstbeleg';
  startDate: string;
  endDate?: string;
  plannedDuration: number; // Tage
  actualDuration?: number; // Tage
  volume: number; // Liter
  alcoholContent?: number; // % Vol.
  ingredients?: string[];
  notes?: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COMPLETE APP DATA (Single-File Format)
// ============================================================================

export interface AppData {
  // Metadata
  version: string; // Datenmodell-Version (z.B. "1.0.0")
  lastUpdate: string; // ISO 8601
  computerName: string; // Hostname des Rechners
  userName: string; // OS Username
  
  // Bestehende Daten (aus tank-data.json)
  tanks: any[]; // TankDefinition[] (bestehender Typ)
  inventory: any[]; // StoredInventoryItem[] (bestehender Typ)
  
  // NEU: Erweiterte Daten
  calendar: CalendarEvent[];
  todos: TodoItem[];
  mazerationProtocols: MazerationProtocol[];
  rezepturen: Rezeptur[]; // NEU: Rezepturen/Ausmischungen
  
  // Optional: Zukünftige Erweiterungen
  settings?: AppSettings;
  notifications?: Notification[];
}

// ============================================================================
// APP SETTINGS (Optional)
// ============================================================================

export interface AppSettings {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'de' | 'en';
  notifications?: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  autoSync?: {
    enabled: boolean;
    interval: number; // Minuten
    lastSync?: string;
  };
  // Hinweis: githubToken wird NICHT synchronisiert (lokal in hybridStorage)
}

// ============================================================================
// NOTIFICATION (Optional)
// ============================================================================

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  expiresAt?: string;
  actionUrl?: string;
}

// ============================================================================
// SYNC METADATA
// ============================================================================

export interface SyncMetadata {
  lastSyncTimestamp: string;
  lastSyncFrom: string; // Computer name
  syncCount: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  timestamp: string;
  localVersion: {
    computerName: string;
    lastUpdate: string;
  };
  remoteVersion: {
    computerName: string;
    lastUpdate: string;
  };
  resolution: 'local' | 'remote' | 'merge' | 'pending';
  resolvedAt?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type SyncDirection = 'upload' | 'download' | 'bidirectional';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'conflict';

export interface SyncResult {
  success: boolean;
  direction: SyncDirection;
  timestamp: string;
  dataSize: number; // Bytes
  duration: number; // Millisekunden
  error?: string;
  conflicts?: SyncConflict[];
}
