/**
 * Theme Management for Dark Mode / Light Mode support
 */

export const THEME_STORAGE_KEY = 'pkl_theme';

export function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false;

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored) {
    return stored === 'dark';
  }

  // Detect system preference if not set
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');

  // Update mobile browser header color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#090d16' : '#0f172a');
  }
}
