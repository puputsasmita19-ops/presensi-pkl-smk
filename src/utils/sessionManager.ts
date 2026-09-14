import { User, Role } from '../types';

export const AUTH_KEY = 'pkl_is_authenticated';
export const USER_KEY = 'pkl_current_user';
export const TAB_KEY = 'pkl_active_tab';
export const ROLE_KEY = 'pkl_user_role';
export const LAST_ACTIVITY_KEY = 'pkl_last_activity_timestamp';
export const AUTO_LOGOUT_NOTICE_KEY = 'pkl_auto_logout_notice';
const COOKIE_USER_KEY = 'pkl_session_user';
const COOKIE_AUTH_KEY = 'pkl_session_auth';

// 30 Menit Auto-Logout Inactivity Timeout
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit (1.800.000 ms)
export const WARNING_BEFORE_LOGOUT_MS = 2 * 60 * 1000; // Peringatan 2 menit sebelum logout (120.000 ms)

/**
 * Catat aktivitas pengguna terbaru (timestamp)
 */
export function recordUserActivity(): void {
  if (typeof window === 'undefined') return;
  try {
    const nowStr = Date.now().toString();
    localStorage.setItem(LAST_ACTIVITY_KEY, nowStr);
  } catch (e) {
    // ignore
  }
}

/**
 * Dapatkan timestamp aktivitas pengguna terakhir
 */
export function getLastActivityTimestamp(): number {
  if (typeof window === 'undefined') return Date.now();
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return Date.now();
}

/**
 * Periksa apakah sesi telah kedaluwarsa karena tidak aktif selama 30 menit
 */
export function isSessionExpiredDueToInactivity(): boolean {
  const lastActive = getLastActivityTimestamp();
  const elapsed = Date.now() - lastActive;
  return elapsed >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Hitung sisa waktu inaktivitas (milidetik) hingga auto-logout
 */
export function getInactivityRemainingMs(): number {
  const lastActive = getLastActivityTimestamp();
  const elapsed = Date.now() - lastActive;
  const remaining = INACTIVITY_TIMEOUT_MS - elapsed;
  return remaining > 0 ? remaining : 0;
}

/**
 * Simpan pesan notifikasi auto-logout agar ditampilkan di halaman login
 */
export function setAutoLogoutNotice(notice: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTO_LOGOUT_NOTICE_KEY, notice);
  } catch {}
}

/**
 * Ambil dan bersihkan pesan notifikasi auto-logout
 */
export function getAndClearAutoLogoutNotice(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const notice = sessionStorage.getItem(AUTO_LOGOUT_NOTICE_KEY);
    if (notice) {
      sessionStorage.removeItem(AUTO_LOGOUT_NOTICE_KEY);
      return notice;
    }
  } catch {}
  return null;
}

export const ROLE_ALLOWED_TABS: Record<Role, string[]> = {
  Siswa: ['presensi', 'statistik', 'jurnal', 'laporan', 'info-pkl'],
  'Guru Pembimbing': ['presensi', 'jurnal', 'laporan', 'log-aktivitas'],
  DUDI: ['presensi', 'jurnal', 'laporan', 'info-dudi'],
  Admin: ['presensi', 'master', 'jurnal', 'laporan', 'log-aktivitas'],
};

// Cookie helpers for robust fallback in privacy/iframe/PWA modes
function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    // ignore
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const nameEQ = encodeURIComponent(name) + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch (e) {
    // ignore
  }
}

/**
 * Validates whether an object has the essential properties of a valid User
 */
export function isValidUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id_user === 'string' &&
    obj.id_user.trim().length > 0 &&
    typeof obj.role === 'string' &&
    ['Siswa', 'Guru Pembimbing', 'DUDI', 'Admin'].includes(obj.role) &&
    typeof obj.nama_lengkap === 'string'
  );
}

/**
 * Synchronously retrieves stored authentication session across all storage tiers
 */
export function getStoredSession(): { isAuthenticated: boolean; user: User | null } {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, user: null };
  }

  let user: User | null = null;

  // 1. Try LocalStorage
  try {
    const rawLocal = localStorage.getItem(USER_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (isValidUser(parsed)) {
        user = parsed;
      }
    }
  } catch (e) {
    // localStorage might be disabled or corrupted
  }

  // 2. Fallback to SessionStorage
  if (!user) {
    try {
      const rawSession = sessionStorage.getItem(USER_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (isValidUser(parsed)) {
          user = parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Fallback to Cookie
  if (!user) {
    try {
      const rawCookie = getCookie(COOKIE_USER_KEY);
      if (rawCookie) {
        const parsed = JSON.parse(rawCookie);
        if (isValidUser(parsed)) {
          user = parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Check auth flags
  let isAuth = false;
  try {
    const authLocal = localStorage.getItem(AUTH_KEY);
    const authSession = sessionStorage.getItem(AUTH_KEY);
    const authCookie = getCookie(COOKIE_AUTH_KEY);
    isAuth = authLocal === 'true' || authSession === 'true' || authCookie === 'true';
  } catch {
    // ignore
  }

  // If we have a verified user object, the session is active
  if (user) {
    return { isAuthenticated: true, user };
  }

  return { isAuthenticated: isAuth && user !== null, user: null };
}

/**
 * Saves user session immediately and synchronously across all tiers
 */
export function saveUserSession(user: User): void {
  if (typeof window === 'undefined') return;

  const userJson = JSON.stringify(user);
  recordUserActivity();

  try {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(USER_KEY, userJson);
    localStorage.setItem(ROLE_KEY, user.role);
  } catch (e) {
    console.warn('LocalStorage error in saveUserSession:', e);
  }

  try {
    sessionStorage.setItem(AUTH_KEY, 'true');
    sessionStorage.setItem(USER_KEY, userJson);
    sessionStorage.setItem(ROLE_KEY, user.role);
  } catch (e) {
    // ignore
  }

  try {
    setCookie(COOKIE_AUTH_KEY, 'true', 30);
    setCookie(COOKIE_USER_KEY, userJson, 30);
  } catch (e) {
    // ignore
  }
}

/**
 * Clears user session completely on logout
 */
export function clearUserSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(TAB_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch (e) {
    // ignore
  }

  try {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(TAB_KEY);
  } catch (e) {
    // ignore
  }

  try {
    deleteCookie(COOKIE_AUTH_KEY);
    deleteCookie(COOKIE_USER_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * Retrieves the appropriate active tab for the given user role,
 * prioritizing URL hash first, then stored tab, and finally role's default tab.
 */
export function getStoredActiveTab(userRole: Role): string {
  const allowed = ROLE_ALLOWED_TABS[userRole] || ['presensi'];

  try {
    // 1. Check URL Hash (highest priority for reload/bookmark)
    if (typeof window !== 'undefined') {
      const rawHash = window.location.hash.replace('#', '').trim();
      const mainHash = rawHash.split('/')[0].split('?')[0];
      if (mainHash && allowed.includes(mainHash)) {
        return mainHash;
      }
    }

    // 2. Check LocalStorage
    if (typeof localStorage !== 'undefined') {
      const savedLocal = localStorage.getItem(TAB_KEY);
      if (savedLocal && allowed.includes(savedLocal)) {
        return savedLocal;
      }
    }

    // 3. Check SessionStorage
    if (typeof sessionStorage !== 'undefined') {
      const savedSession = sessionStorage.getItem(TAB_KEY);
      if (savedSession && allowed.includes(savedSession)) {
        return savedSession;
      }
    }
  } catch {
    // fallback
  }

  return allowed[0] || 'presensi';
}

/**
 * Synchronizes active tab to storage and URL hash without causing navigation reload
 */
export function saveActiveTab(tab: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(TAB_KEY, tab);
  } catch {
    // ignore
  }

  try {
    sessionStorage.setItem(TAB_KEY, tab);
  } catch {
    // ignore
  }

  try {
    const currentRawHash = window.location.hash.replace('#', '').trim();
    const currentMain = currentRawHash.split('/')[0].split('?')[0];
    if (currentMain !== tab) {
      if (currentRawHash.startsWith(`${tab}/`)) {
        // Keep sub-route if on same module
      } else {
        window.history.replaceState(null, '', `#${tab}`);
      }
    }
  } catch {
    // ignore
  }
}
