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
 * Detect if the current device is a mobile or touch device.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  );
}

/**
 * Enable smooth transition class temporarily on html so that structural UI elements
 * interpolate background-color and text smoothly without heavy wildcard overhead.
 */
export function enableThemeTransition(durationMs = 350): void {
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
  | { clientX?: number; clientY?: number; currentTarget?: any; nativeEvent?: any }
  | null
  | undefined;

/**
 * Executes a buttery-smooth dark/light mode transition optimized for both
 * mobile smartphones (60-120fps GPU compositor) and desktops (radial circular sweep).
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

  const isMobile = isMobileDevice();

  // Check if View Transition API is supported and user doesn't prefer reduced motion
  const supportsViewTransition =
    'startViewTransition' in document &&
    typeof (document as any).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (supportsViewTransition) {
    isTransitioning = true;
    const root = document.documentElement;
    root.classList.toggle('is-mobile-theme', isMobile);

    try {
      // Start the view transition snapshot
      // We do NOT add `theme-transitioning` here because animating CSS during snapshotting
      // causes dual-rendering jank on mobile GPUs.
      const transition = (document as any).startViewTransition(() => {
        applyTheme(targetDark);
        onStateUpdate?.();
      });

      await transition.ready;

      // On desktop: If supported, animate the circular radial wave from the click location!
      // On mobile: Handled directly in index.css via GPU compositor transform & opacity (silky 60-120fps)!
      if (!isMobile) {
        let originX = window.innerWidth / 2;
        let originY = 40;

        if (trigger) {
          const native = (trigger as any).nativeEvent || trigger;
          const touch = native?.touches?.[0] || native?.changedTouches?.[0];
          if (touch && typeof touch.clientX === 'number') {
            originX = touch.clientX;
            originY = touch.clientY;
          } else if (
            'clientX' in trigger &&
            typeof trigger.clientX === 'number' &&
            trigger.clientX !== 0
          ) {
            originX = trigger.clientX;
            originY = trigger.clientY ?? originY;
          } else if ('currentTarget' in trigger && trigger.currentTarget) {
            const rect = (trigger.currentTarget as HTMLElement).getBoundingClientRect();
            originX = rect.left + rect.width / 2;
            originY = rect.top + rect.height / 2;
          } else if (
            'getBoundingClientRect' in trigger &&
            typeof trigger.getBoundingClientRect === 'function'
          ) {
            const rect = (trigger as HTMLElement).getBoundingClientRect();
            originX = rect.left + rect.width / 2;
            originY = rect.top + rect.height / 2;
          }
        }

        const endRadius = Math.hypot(
          Math.max(originX, window.innerWidth - originX),
          Math.max(originY, window.innerHeight - originY)
        );

        try {
          const animation = root.animate(
            {
              clipPath: [
                `circle(0px at ${originX}px ${originY}px)`,
                `circle(${endRadius}px at ${originX}px ${originY}px)`,
              ],
            },
            {
              duration: 450,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
          await animation.finished;
        } catch {
          // Safari or desktop browser without pseudoElement in Web Animations API:
          // Smooth CSS cross-fade handles it gracefully.
        }
      }

      await transition.finished;
    } catch {
      applyTheme(targetDark);
      onStateUpdate?.();
    } finally {
      root.classList.remove('is-mobile-theme');
      isTransitioning = false;
    }
    return;
  }

  // Fallback: smooth property transition on structural elements
  enableThemeTransition(350);
  applyTheme(targetDark);
  onStateUpdate?.();
}
