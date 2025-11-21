'use client';

import { useEffect } from 'react';

export default function OAuthCallback() {
  useEffect(() => {
    // Sende Access Token zurück zum Opener-Fenster
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'oauth-callback',
          hash: window.location.hash,
        },
        window.location.origin
      );
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <h1 className="text-xl font-semibold">Anmeldung erfolgreich</h1>
        <p className="text-muted-foreground">
          Sie werden weitergeleitet...
        </p>
      </div>
    </div>
  );
}
