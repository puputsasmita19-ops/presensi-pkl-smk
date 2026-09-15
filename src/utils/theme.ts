/**
 * Theme Management for Dark Mode / Light Mode support with smooth motion transitions
 */

import type React from 'react';

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
    metaTheme.setAttribute('content', isDark ? '#020617' : '#0f172a');
  }
}

let themeTransitionTimer: ReturnType<typeof setTimeout> | null = null;
let isTransitioning = false;

/**
 * Enable smooth transition class temporarily on html so that all UI elements
 * interpolate background-color, border-color, and text smoothly without lingering overhead.
 */
export function enableThemeTransition(durationMs = 500): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('theme-transitioning');

  if (themeTransitionTimer) {
    clearTimeout(themeTransitionTimer);
  }

  themeTransitionTimer = setTimeout(() => {
    root.classList.remove('theme-transitioning');
    themeTransitionTimer = null;
  }, durationMs);
}

export type ThemeTriggerEvent =
  | React.MouseEvent<HTMLElement>
  | MouseEvent
  | HTMLElement
  | { clientX?: number; clientY?: number }
  | null
  | undefined;

/**
 * Executes a buttery-smooth dark/light mode transition.
 * Prefers the native View Transitions API with a circular radial expansion
 * from the user's cursor / toggle button. If unsupported, seamlessly falls back
 * to cubic-bezier CSS property interpolation.
 */
export async function toggleThemeWithSmoothTransition(
  targetDark: boolean,
  trigger?: ThemeTriggerEvent,
  onStateUpdate?: () => void
): Promise<void> {
  if (typeof document === 'undefined') {
    onStateUpdate?.();
    return;
  }

  if (isTransitioning) {
    applyTheme(targetDark);
    onStateUpdate?.();
    return;
  }

  // 1. Calculate origin coordinates for circular wave transition
  let originX = window.innerWidth / 2;
  let originY = 40;

  if (trigger) {
    if ('clientX' in trigger && typeof trigger.clientX === 'number' && trigger.clientX !== 0) {
      originX = trigger.clientX;
      originY = trigger.clientY ?? originY;
    } else if ('currentTarget' in trigger && trigger.currentTarget) {
      const rect = (trigger.currentTarget as HTMLElement).getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    } else if ('getBoundingClientRect' in trigger && typeof trigger.getBoundingClientRect === 'function') {
      const rect = (trigger as HTMLElement).getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }
  }

  const endRadius = Math.hypot(
    Math.max(originX, window.innerWidth - originX),
    Math.max(originY, window.innerHeight - originY)
  );

  const supportsViewTransition =
    'startViewTransition' in document &&
    typeof (document as any).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (supportsViewTransition) {
    isTransitioning = true;
    try {
      enableThemeTransition(600);

      const transition = (document as any).startViewTransition(() => {
        applyTheme(targetDark);
        onStateUpdate?.();
      });

      await transition.ready;

      const animation = document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${originX}px ${originY}px)`,
            `circle(${endRadius}px at ${originX}px ${originY}px)`,
          ],
        },
        {
          duration: 480,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );

      await animation.finished;
      await transition.finished;
    } catch {
      // Fallback in case of an abort or error in startViewTransition
      applyTheme(targetDark);
      onStateUpdate?.();
    } finally {
      isTransitioning = false;
    }
    return;
  }

  // Fallback: smooth property transition
  enableThemeTransition(500);
  applyTheme(targetDark);
  onStateUpdate?.();
}
