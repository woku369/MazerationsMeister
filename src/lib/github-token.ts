const TOKEN_KEY = 'github-token';
const ENABLED_KEY = 'github-enabled';
const CONFIG_EVENT = 'githubConfigUpdated';

export interface GithubConfig {
  token: string;
  enabled: boolean;
}

export function getGithubToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getGithubEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ENABLED_KEY) === 'true';
}

export function getGithubConfig(): GithubConfig {
  return { token: getGithubToken(), enabled: getGithubEnabled() };
}

export function setGithubToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

/**
 * Einziger Schreibpfad, der Token + Enabled-Flag zusammen setzt und
 * andere Komponenten per Event benachrichtigt - ersetzt die bisher an
 * mehreren Stellen duplizierte Kombination aus setItem(s) + dispatchEvent.
 */
export function setGithubConfig(token: string, enabled: boolean): void {
  const trimmed = token.trim();
  localStorage.setItem(TOKEN_KEY, trimmed);
  localStorage.setItem(ENABLED_KEY, String(enabled));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<GithubConfig>(CONFIG_EVENT, {
      detail: { token: trimmed, enabled },
    }));
  }
}

export function onGithubConfigChanged(handler: (config: GithubConfig) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => handler((event as CustomEvent<GithubConfig>).detail);
  window.addEventListener(CONFIG_EVENT, listener);
  return () => window.removeEventListener(CONFIG_EVENT, listener);
}
