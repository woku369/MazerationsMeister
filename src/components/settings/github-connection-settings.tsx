/**
 * Zentrale GitHub-Verbindung UI-Komponente
 * Ersetzt die doppelte GitHub-Konfiguration
 */

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Github,
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Save,
  Info,
  Eye,
  EyeOff
} from "lucide-react";
import { githubConfigManager } from "@/lib/github-config";
import type { GitHubStatus } from "@/lib/github-config";

export function GitHubConnectionSettings() {
  const [hydrated, setHydrated] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState('woku369');
  const [githubRepository, setGithubRepository] = useState('MazerationsMeister');
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<GitHubStatus>({
    configured: false,
    connected: false,
    config: null,
    lastTest: null
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
  } | null>(null);

  // Hydration-Fix
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Load Config
  useEffect(() => {
    if (hydrated) {
      loadConfig();
    }
  }, [hydrated]);

  const loadConfig = async () => {
    try {
      await githubConfigManager.loadConfig();
      const currentStatus = githubConfigManager.getStatus();
      setStatus(currentStatus);

      if (currentStatus.config) {
        setGithubToken(currentStatus.config.token);
        setGithubUsername(currentStatus.config.username);
        setGithubRepository(currentStatus.config.repository);
      }
    } catch (error) {
      console.error('[GitHubConnectionSettings] Fehler beim Laden:', error);
    }
  };

  const handleSave = async () => {
    if (!githubToken.trim()) {
      setMessage({
        type: 'error',
        text: 'Bitte GitHub Token eingeben!'
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await githubConfigManager.saveConfig({
        token: githubToken.trim(),
        username: githubUsername.trim(),
        repository: githubRepository.trim()
      });

      setMessage({
        type: 'success',
        text: '✅ GitHub-Verbindung gespeichert!'
      });

      // Reload Status
      setStatus(githubConfigManager.getStatus());
    } catch (error) {
      console.error('[GitHubConnectionSettings] Fehler beim Speichern:', error);
      setMessage({
        type: 'error',
        text: `❌ Fehler: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!githubToken.trim()) {
      setMessage({
        type: 'error',
        text: 'Bitte GitHub Token eingeben!'
      });
      return;
    }

    setIsTesting(true);
    setMessage(null);

    try {
      // Save first
      await githubConfigManager.saveConfig({
        token: githubToken.trim(),
        username: githubUsername.trim(),
        repository: githubRepository.trim()
      });

      // Then test
      const ok = await githubConfigManager.testConnection();
      
      setStatus(githubConfigManager.getStatus());

      setMessage({
        type: ok ? 'success' : 'error',
        text: ok 
          ? `✅ Verbindung erfolgreich! Repository ${githubUsername}/${githubRepository} erreichbar.`
          : '❌ Verbindung fehlgeschlagen! Bitte Token und Repository prüfen.'
      });
    } catch (error) {
      console.error('[GitHubConnectionSettings] Fehler beim Testen:', error);
      setMessage({
        type: 'error',
        text: `❌ Verbindungstest fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('GitHub-Verbindung wirklich zurücksetzen?')) return;

    try {
      await githubConfigManager.resetConfig();
      setGithubToken('');
      setGithubUsername('woku369');
      setGithubRepository('MazerationsMeister');
      setStatus(githubConfigManager.getStatus());
      setMessage({
        type: 'info',
        text: 'GitHub-Verbindung zurückgesetzt'
      });
    } catch (error) {
      console.error('[GitHubConnectionSettings] Fehler beim Reset:', error);
    }
  };

  if (!hydrated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔐 GitHub-Verbindung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Lädt...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub-Verbindung
        </CardTitle>
        <CardDescription>
          Zentrale Konfiguration für <strong>Tank-QR-System</strong> und <strong>App-Daten-Synchronisation</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {status.configured && status.connected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="mr-1 h-3 w-3" />
              Verbunden
            </Badge>
          ) : status.configured ? (
            <Badge variant="secondary">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Konfiguriert (nicht getestet)
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Nicht konfiguriert
            </Badge>
          )}

          {status.lastTest && (
            <span className="text-xs text-muted-foreground">
              Letzter Test: {status.lastTest.toLocaleString('de-DE')}
            </span>
          )}
        </div>

        {/* Info Alert */}
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Einmalige Konfiguration:</strong> Diese GitHub-Verbindung wird von beiden Sync-Systemen verwendet.
            <br />
            <strong>Token-Quelle:</strong> {status.config ? 'Gespeichert in App' : 'Aus .env.local (falls vorhanden)'}
          </AlertDescription>
        </Alert>

        {/* Message */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Token Input */}
        <div className="space-y-2">
          <Label htmlFor="github-token">
            GitHub Personal Access Token
            <a 
              href="https://github.com/settings/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 text-xs text-blue-500 hover:underline"
            >
              Token erstellen →
            </a>
          </Label>
          <div className="flex gap-2">
            <Input
              id="github-token"
              type={showToken ? "text" : "password"}
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="font-mono text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Erforderliche Scopes: <code className="bg-muted px-1 py-0.5 rounded">repo</code> (Full control)
          </p>
        </div>

        {/* Username & Repository */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="github-username">Username</Label>
            <Input
              id="github-username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="woku369"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github-repository">Repository</Label>
            <Input
              id="github-repository"
              value={githubRepository}
              onChange={(e) => setGithubRepository(e.target.value)}
              placeholder="MazerationsMeister"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Speichern
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleTestConnection} 
            disabled={isTesting || !githubToken.trim()}
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Verbindung testen
          </Button>

          {status.configured && (
            <Button 
              variant="ghost" 
              onClick={handleReset}
              className="ml-auto"
            >
              Zurücksetzen
            </Button>
          )}
        </div>

        {/* Info: Wo wird es verwendet? */}
        <div className="p-3 bg-muted rounded text-xs space-y-1">
          <p className="font-semibold">Diese Verbindung wird verwendet für:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>🏷️ <strong>Tank-QR-System:</strong> Automatischer Upload von Tank-Daten zu GitHub Pages</li>
            <li>📊 <strong>App-Daten-Sync:</strong> 2-Rechner-Synchronisation (Tanks, Inventar, Kalender, TODOs, Protokolle)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
