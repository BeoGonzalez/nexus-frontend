import { describe, it, expect } from 'vitest';
import { resolveTheme, readPreference, applyTheme, THEME_STORAGE_KEY } from '@/presentation/lib/theme';

describe('resolveTheme', () => {
  it('sigue al sistema cuando no hay preferencia guardada', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });

  it('respeta una elección explícita por encima del sistema', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('"system" se resuelve con la preferencia del sistema', () => {
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
  });
});

describe('readPreference', () => {
  it('usa la clave nexus-theme', () => {
    expect(THEME_STORAGE_KEY).toBe('nexus-theme');
    expect(readPreference({ getItem: (k: string) => (k === 'nexus-theme' ? 'dark' : null) })).toBe('dark');
  });

  it('devuelve "system" ante un valor inválido', () => {
    expect(readPreference({ getItem: () => 'x' })).toBe('system');
  });

  it('devuelve "system" si el almacenamiento lanza (modo privado)', () => {
    expect(
      readPreference({
        getItem: () => {
          throw new Error('denied');
        },
      }),
    ).toBe('system');
  });

  it('devuelve "system" sin almacenamiento', () => {
    expect(readPreference(null)).toBe('system');
  });
});

describe('applyTheme', () => {
  it('fija data-theme y la clase dark', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    expect(root.classList.contains('dark')).toBe(true);
    applyTheme('light', root);
    expect(root.dataset.theme).toBe('light');
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
  });
});
