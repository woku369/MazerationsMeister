const KEY = 'github-token';

export function getGithubToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(KEY) || '';
}

export function setGithubToken(token: string): void {
  localStorage.setItem(KEY, token.trim());
}
