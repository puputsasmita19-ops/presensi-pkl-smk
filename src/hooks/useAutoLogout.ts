import { useState, useEffect, useCallback, useRef } from 'react';
import {
  INACTIVITY_TIMEOUT_MS,
  WARNING_BEFORE_LOGOUT_MS,
  recordUserActivity,
  getLastActivityTimestamp,
} from '../utils/sessionManager';

interface UseAutoLogoutOptions {
  enabled: boolean;
  onAutoLogout: () => void;
  timeoutMs?: number;
  warningMs?: number;
}

export function useAutoLogout({
  enabled,
  onAutoLogout,
  timeoutMs = INACTIVITY_TIMEOUT_MS,
  warningMs = WARNING_BEFORE_LOGOUT_MS,
}: UseAutoLogoutOptions) {
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120);

  const lastRecordedRef = useRef<number>(Date.now());
  const onAutoLogoutRef = useRef(onAutoLogout);

  // Keep callback reference updated
  useEffect(() => {
    onAutoLogoutRef.current = onAutoLogout;
  }, [onAutoLogout]);

  // Reset/record user activity with throttling (at most once every 5 seconds)
  const handleUserActivity = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastRecordedRef.current > 5000) {
      lastRecordedRef.current = now;
      recordUserActivity();
    }
  }, [enabled]);

  // Explicit user confirmation to stay logged in
  const stayLoggedIn = useCallback(() => {
    lastRecordedRef.current = Date.now();
    recordUserActivity();
    setShowWarningModal(false);
  }, []);

  // Main inactivity tracking effect
  useEffect(() => {
    if (!enabled) {
      setShowWarningModal(false);
      return;
    }

    // Record initial activity on mount / login
    recordUserActivity();
    lastRecordedRef.current = Date.now();

    // Event listeners for user interaction
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];
    const onActivity = () => {
      // Don't auto-dismiss warning modal on pure passive mousemove if warning modal is active,
      // user should click "Tetap Masuk" or interact explicitly
      if (!showWarningModal) {
        handleUserActivity();
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, onActivity, { passive: true });
    });

    // Cross-tab synchronization via localStorage storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pkl_last_activity_timestamp' && e.newValue) {
        const timestamp = parseInt(e.newValue, 10);
        if (!isNaN(timestamp)) {
          lastRecordedRef.current = timestamp;
          const elapsed = Date.now() - timestamp;
          const remaining = timeoutMs - elapsed;
          if (remaining > warningMs) {
            setShowWarningModal(false);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Check timer loop every 1 second
    const checkTimer = setInterval(() => {
      const lastActive = getLastActivityTimestamp();
      const elapsed = Date.now() - lastActive;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        setShowWarningModal(false);
        clearInterval(checkTimer);
        onAutoLogoutRef.current();
      } else if (remaining <= warningMs) {
        setShowWarningModal(true);
        setRemainingSeconds(Math.ceil(remaining / 1000));
      } else {
        if (showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, 1000);

    // Tab visibility & focus check
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastActive = getLastActivityTimestamp();
        const elapsed = Date.now() - lastActive;
        const remaining = timeoutMs - elapsed;
        if (remaining <= 0) {
          setShowWarningModal(false);
          onAutoLogoutRef.current();
        } else if (remaining <= warningMs) {
          setShowWarningModal(true);
          setRemainingSeconds(Math.ceil(remaining / 1000));
        } else {
          setShowWarningModal(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, onActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(checkTimer);
    };
  }, [enabled, timeoutMs, warningMs, handleUserActivity, showWarningModal]);

  return {
    showWarningModal,
    remainingSeconds,
    stayLoggedIn,
  };
}
