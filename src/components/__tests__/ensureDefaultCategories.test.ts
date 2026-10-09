import { describe, it, expect, beforeEach } from 'vitest';
import { ensureDefaultCategories } from '../app-data-initializer';

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

describe('ensureDefaultCategories()', () => {
  beforeEach(() => {
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = makeLocalStorage();
  });

  it('legt M und Dest an, wenn "inventoryCategories" noch nie gesetzt wurde', () => {
    ensureDefaultCategories();
    const stored = JSON.parse(localStorage.getItem('inventoryCategories')!);
    expect(stored).toEqual([
      { name: 'M', color: '#3b82f6' },
      { name: 'Dest', color: '#8b5cf6' },
    ]);
  });

  it('überschreibt eine bewusst geleerte Liste nicht erneut', () => {
    localStorage.setItem('inventoryCategories', JSON.stringify([]));
    ensureDefaultCategories();
    expect(localStorage.getItem('inventoryCategories')).toBe('[]');
  });

  it('fasst eine bereits vom Nutzer angepasste Liste nicht an', () => {
    localStorage.setItem('inventoryCategories', JSON.stringify([{ name: 'Sonderposten', color: '#000000' }]));
    ensureDefaultCategories();
    expect(JSON.parse(localStorage.getItem('inventoryCategories')!)).toEqual([{ name: 'Sonderposten', color: '#000000' }]);
  });
});
