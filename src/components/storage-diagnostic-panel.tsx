/**
 * Storage Diagnostic Panel
 * 
 * Provides comprehensive diagnostics for the Hybrid Storage System
 * - Shows current storage environment
 * - Tests read/write operations
 * - Displays storage statistics
 * - Provides manual sync and export/import functions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { hybridStorage, type StorageStats } from '@/lib/hybrid-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Database, 
  Download, 
  Upload, 
  Check, 
  X, 
  Info,
  Settings,
  HardDrive,
  Globe,
  Activity
} from 'lucide-react';

interface DiagnosticData {
  environment: string;
  electronAvailable: boolean;
  electronReady: boolean;
  browserStorageAvailable: boolean;
  keyCount: number;
  sampleData: any;
  errors: string[];
}

export function StorageDiagnosticPanel() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{[key: string]: boolean}>({});
  const [exportData, setExportData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Initial load
  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const refreshDiagnostics = async () => {
    setIsLoading(true);
    try {
      const [currentStats, diagnosticData] = await Promise.all([
        hybridStorage.getStats(),
        hybridStorage.diagnose()
      ]);
      
      setStats(currentStats);
      setDiagnostics(diagnosticData);
      
      console.log('[StorageDiagnostics] Updated:', { currentStats, diagnosticData });
    } catch (error) {
      console.error('[StorageDiagnostics] Error:', error);
      setMessage({ type: 'error', text: `Diagnose fehlgeschlagen: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const runStorageTest = async (testName: string, testFn: () => Promise<void>) => {
    try {
      setTestResults(prev => ({ ...prev, [testName]: false }));
      await testFn();
      setTestResults(prev => ({ ...prev, [testName]: true }));
      setMessage({ type: 'success', text: `Test "${testName}" erfolgreich` });
    } catch (error) {
      setTestResults(prev => ({ ...prev, [testName]: false }));
      setMessage({ type: 'error', text: `Test "${testName}" fehlgeschlagen: ${error}` });
    }
  };

  const testBasicOperations = () => runStorageTest('basic-operations', async () => {
    const testKey = '_test_basic_ops';
    const testValue = { timestamp: Date.now(), data: 'test' };
    
    await hybridStorage.set(testKey, testValue);
    const retrieved = await hybridStorage.get(testKey);
    
    if (JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
      throw new Error('Daten-Mismatch bei Read/Write');
    }
    
    await hybridStorage.remove(testKey);
    const afterRemove = await hybridStorage.get(testKey);
    
    if (afterRemove !== null) {
      throw new Error('Entfernen fehlgeschlagen');
    }
  });

  const testSyncOperation = () => runStorageTest('sync-operation', async () => {
    await hybridStorage.sync();
  });

  const testKeysOperation = () => runStorageTest('keys-operation', async () => {
    const keys = await hybridStorage.keys();
    if (!Array.isArray(keys)) {
      throw new Error('Keys-Operation liefert kein Array');
    }
  });

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const data = await hybridStorage.export();
      setExportData(JSON.stringify(data, null, 2));
      setMessage({ type: 'success', text: 'Daten erfolgreich exportiert' });
    } catch (error) {
      setMessage({ type: 'error', text: `Export fehlgeschlagen: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      if (!importData.trim()) {
        throw new Error('Keine Import-Daten vorhanden');
      }
      
      const data = JSON.parse(importData);
      await hybridStorage.import(data);
      setMessage({ type: 'success', text: 'Daten erfolgreich importiert' });
      await refreshDiagnostics();
    } catch (error) {
      setMessage({ type: 'error', text: `Import fehlgeschlagen: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const clearStorage = async () => {
    if (!confirm('Wirklich alle Storage-Daten löschen? Dies kann nicht rückgängig gemacht werden!')) {
      return;
    }

    try {
      setIsLoading(true);
      await hybridStorage.clear();
      setMessage({ type: 'success', text: 'Storage erfolgreich geleert' });
      await refreshDiagnostics();
    } catch (error) {
      setMessage({ type: 'error', text: `Leeren fehlgeschlagen: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const getEnvironmentIcon = (env: string) => {
    switch (env) {
      case 'electron': return <HardDrive className="h-4 w-4" />;
      case 'browser': return <Globe className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: boolean, trueText: string, falseText: string) => (
    <Badge variant={status ? 'default' : 'destructive'} className="flex items-center gap-1">
      {status ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {status ? trueText : falseText}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Storage Diagnostics</h2>
        </div>
        <Button onClick={refreshDiagnostics} disabled={isLoading} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Status Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <Info className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getEnvironmentIcon(stats?.environment || 'unknown')}
              Environment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Umgebung:</span>
                  <Badge variant="outline" className="capitalize">
                    {stats.environment}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Schlüssel:</span>
                  <Badge variant="secondary">{stats.keyCount}</Badge>
                </div>

                {diagnostics && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Electron:</span>
                      {getStatusBadge(
                        diagnostics.electronAvailable && diagnostics.electronReady,
                        'Verfügbar',
                        'Nicht verfügbar'
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Browser Storage:</span>
                      {getStatusBadge(
                        diagnostics.browserStorageAvailable,
                        'Verfügbar',
                        'Nicht verfügbar'
                      )}
                    </div>
                  </>
                )}

                {stats.lastSync && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Letzte Sync:</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.lastSync.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Test Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Funktionstest
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={testBasicOperations} 
                disabled={isLoading}
                variant="outline"
                className="justify-between"
              >
                <span>Basic Operations</span>
                {testResults['basic-operations'] !== undefined && (
                  testResults['basic-operations'] ? 
                    <Check className="h-4 w-4 text-green-600" /> : 
                    <X className="h-4 w-4 text-red-600" />
                )}
              </Button>

              <Button 
                onClick={testSyncOperation} 
                disabled={isLoading}
                variant="outline"
                className="justify-between"
              >
                <span>Sync Operation</span>
                {testResults['sync-operation'] !== undefined && (
                  testResults['sync-operation'] ? 
                    <Check className="h-4 w-4 text-green-600" /> : 
                    <X className="h-4 w-4 text-red-600" />
                )}
              </Button>

              <Button 
                onClick={testKeysOperation} 
                disabled={isLoading}
                variant="outline"
                className="justify-between"
              >
                <span>Keys Operation</span>
                {testResults['keys-operation'] !== undefined && (
                  testResults['keys-operation'] ? 
                    <Check className="h-4 w-4 text-green-600" /> : 
                    <X className="h-4 w-4 text-red-600" />
                )}
              </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleExport} disabled={isLoading} variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button onClick={clearStorage} disabled={isLoading} variant="destructive" size="sm">
                <Database className="h-4 w-4 mr-2" />
                Leeren
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export/Import Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={exportData}
              readOnly
              placeholder="Exportierte Daten erscheinen hier..."
              className="min-h-[200px] font-mono text-xs"
            />
          </CardContent>
        </Card>

        {/* Import Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea 
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder='{"key": "value", ...}'
              className="min-h-[160px] font-mono text-xs"
            />
            <Button 
              onClick={handleImport} 
              disabled={isLoading || !importData.trim()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importieren
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Error Log */}
      {stats?.errors && stats.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <X className="h-4 w-4" />
              Error Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {stats.errors.map((error, index) => (
                <div key={index} className="text-xs font-mono text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Diagnostics */}
      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Raw Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StorageDiagnosticPanel;