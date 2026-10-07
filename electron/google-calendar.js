"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGoogleCalendarAuth = startGoogleCalendarAuth;
exports.refreshGoogleCalendarToken = refreshGoogleCalendarToken;
/**
 * Google Calendar OAuth (Nutzer-Anfrage 07.10.2026): persönlicher Google-
 * Kalender direkt im Dashboard sehen und bearbeiten.
 *
 * Läuft bewusst komplett im Hauptprozess, nicht im Renderer:
 * - Der OAuth-"Loopback"-Ablauf (von Google für Desktop-Apps empfohlen, siehe
 *   https://developers.google.com/identity/protocols/oauth2/native-app)
 *   braucht einen echten lokalen HTTP-Server, der die Weiterleitung nach der
 *   Google-Zustimmung abfängt - im Renderer gibt es dafür keinen Zugriff
 *   (contextIsolation: true, kein Node, siehe preload.js).
 * - Googles Token-Endpoint ist nicht für CORS-Anfragen von beliebigen
 *   Browser-Origins gedacht (ähnliche Einschränkung wie bei GitHubs Contents-
 *   API, siehe Aufgabe 49) - der Code-gegen-Token-Tausch läuft deshalb hier,
 *   wo es kein CORS gibt.
 *
 * Die eigentlichen Kalender-API-Aufrufe (Termine lesen/anlegen/ändern/
 * löschen) laufen dagegen im Renderer (src/lib/google-calendar.ts) - Googles
 * Calendar-REST-API selbst erlaubt echte Browser-Aufrufe mit Bearer-Token.
 */
const electron_1 = require("electron");
const http_1 = require("http");
const url_1 = require("url");
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/calendar';
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
function htmlResponse(ok, message) {
    const title = ok ? '✅ Verbunden' : '❌ Fehler';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;color:#333">
<h2>${title}</h2><p>${message}</p>
<p style="color:#888;font-size:14px">Dieses Fenster kann geschlossen werden.</p>
</body></html>`;
}
async function exchangeCodeForTokens(code, clientId, clientSecret, redirectUri) {
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }).toString(),
    });
    if (!res.ok) {
        throw new Error(`Token-Austausch fehlgeschlagen (${res.status}): ${await res.text()}`);
    }
    return (await res.json());
}
/**
 * Kompletter OAuth-Loopback-Ablauf: öffnet den System-Browser für die
 * Google-Zustimmung, fängt die Weiterleitung über einen kurzlebigen lokalen
 * HTTP-Server (zufälliger freier Port) ab, tauscht den Code gegen Tokens.
 */
async function startGoogleCalendarAuth(clientId, clientSecret) {
    if (!clientId.trim() || !clientSecret.trim()) {
        throw new Error('Client-ID und Client-Secret werden benötigt.');
    }
    const server = (0, http_1.createServer)();
    const port = await new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (address && typeof address === 'object')
                resolve(address.port);
            else
                reject(new Error('Konnte lokalen Server nicht starten.'));
        });
    });
    const redirectUri = `http://127.0.0.1:${port}`;
    const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
    authUrl.searchParams.set('client_id', clientId.trim());
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    const code = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            server.close();
            reject(new Error('Zeitüberschreitung - keine Antwort von Google innerhalb von 5 Minuten.'));
        }, AUTH_TIMEOUT_MS);
        server.on('request', (req, res) => {
            const parsed = (0, url_1.parse)(req.url || '', true);
            const authCode = typeof parsed.query.code === 'string' ? parsed.query.code : undefined;
            const authError = typeof parsed.query.error === 'string' ? parsed.query.error : undefined;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(htmlResponse(!!authCode, authCode ? 'Google Calendar ist jetzt verbunden.' : (authError || 'Unbekannter Fehler.')));
            clearTimeout(timeout);
            server.close();
            if (authCode)
                resolve(authCode);
            else
                reject(new Error(authError || 'Kein Autorisierungscode erhalten.'));
        });
        server.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
        electron_1.shell.openExternal(authUrl.toString());
    });
    return exchangeCodeForTokens(code, clientId.trim(), clientSecret.trim(), redirectUri);
}
/** Tauscht einen abgelaufenen Access-Token über den Refresh-Token gegen einen neuen. */
async function refreshGoogleCalendarToken(refreshToken, clientId, clientSecret) {
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId.trim(),
            client_secret: clientSecret.trim(),
            grant_type: 'refresh_token',
        }).toString(),
    });
    if (!res.ok) {
        throw new Error(`Token-Erneuerung fehlgeschlagen (${res.status}): ${await res.text()}`);
    }
    return (await res.json());
}
