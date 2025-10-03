// auth-config.js - PIN-Konfiguration
const AUTH_CONFIG = {
  // Admin-PIN (permanent gültig)
  admin: {
    pin: "00369",            // Admin-PIN (5-stellig)
    name: "Admin",
    validityDays: 365000,    // Praktisch permanent (1000 Jahre)
    role: "admin"
  },
  
  // Guest-PIN (24 Stunden gültig)
  guest: {
    pin: "78963",            // Guest-PIN (5-stellig)
    name: "Gast",
    validityHours: 24,       // 24 Stunden gültig
    role: "guest"
  }
};

// Sicherheits-Hash (verhindert einfaches Auslesen der PINs)
// SHA-256-Hashes der PINs
const HASHED_PINS = {
  admin: "dd872e77ef3f72cfcc3cb178a18337e9ec6d1b94ee593e418a708ca2ab6b9a0e", // SHA-256 von "00369"
  guest: "eec8d53877f6a527a2c227272cc42ae50ea691c2f5a53c37e121af04c12b7fff"  // SHA-256 von "78963"
};

// Auth-Check-Funktion
function checkAuth() {
  const authToken = localStorage.getItem('auth_token');
  const authExpiry = localStorage.getItem('auth_expiry');
  
  if (!authToken || !authExpiry) {
    return false; // Nicht eingeloggt
  }
  
  const now = Date.now();
  if (now > parseInt(authExpiry)) {
    // Token abgelaufen
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_expiry');
    return false;
  }
  
  return true; // Eingeloggt und gültig
}

// Login-Funktion
async function login(pin) {
  // PIN hashen (SHA-256)
  const hashedPin = await hashPIN(pin);
  
  let role = null;
  let validityMs = 0;
  
  // Admin-PIN?
  if (hashedPin === HASHED_PINS.admin) {
    role = 'admin';
    validityMs = AUTH_CONFIG.admin.validityDays * 24 * 60 * 60 * 1000; // 30 Tage
  }
  // Guest-PIN?
  else if (hashedPin === HASHED_PINS.guest) {
    role = 'guest';
    validityMs = AUTH_CONFIG.guest.validityHours * 60 * 60 * 1000; // 24 Stunden
  }
  else {
    return { success: false, error: 'Ungültige PIN' };
  }
  
  // Token erstellen und speichern
  const token = generateToken(role);
  const expiry = Date.now() + validityMs;
  
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_expiry', expiry.toString());
  localStorage.setItem('auth_role', role);
  
  return { 
    success: true, 
    role: role,
    expiresIn: validityMs
  };
}

// SHA-256 Hash-Funktion
async function hashPIN(pin) {
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Token-Generator
function generateToken(role) {
  return btoa(JSON.stringify({
    role: role,
    timestamp: Date.now(),
    random: Math.random().toString(36)
  }));
}

// Logout-Funktion
function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_expiry');
  localStorage.removeItem('auth_role');
}

// Verbleibende Zeit anzeigen
function getRemainingTime() {
  const expiry = localStorage.getItem('auth_expiry');
  if (!expiry) return null;
  
  const remaining = parseInt(expiry) - Date.now();
  if (remaining <= 0) return null;
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} Tag${days > 1 ? 'e' : ''}`;
  } else {
    return `${hours} Stunde${hours !== 1 ? 'n' : ''}`;
  }
}
