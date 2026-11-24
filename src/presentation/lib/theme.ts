export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'nexus-theme';

const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function resolveTheme(pref: ThemePreference | null, prefersDark: boolean): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  return prefersDark ? 'dark' : 'light';
}

export function readPreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference {
  if (!storage) return 'system';
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return PREFERENCES.includes(value as ThemePreference) ? (value as ThemePreference) : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(resolved: ResolvedTheme, root: HTMLElement): void {
  root.dataset.theme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

/**
 * Same logic as readPreference + resolveTheme + applyTheme, inlined as a string so it can
 * run in <head> before first paint (no flash of the wrong theme).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}',p=null;try{p=localStorage.getItem(k)}catch(e){}if(p!=='light'&&p!=='dark'){p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;r.dataset.theme=p;r.classList.toggle('dark',p==='dark');r.style.colorScheme=p}catch(e){}})();`;
