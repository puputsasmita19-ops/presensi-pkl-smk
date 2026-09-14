/**
 * Layanan Autentikasi Google OAuth untuk Google Drive API
 * Mendukung Firebase Auth Google Provider dan Google Identity Services (GSI)
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Inisialisasi Firebase App & Auth
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider dengan Scope Google Drive
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.setCustomParameters({
  prompt: 'select_account consent',
});

// OAuth Client ID bawaan dari konfigurasi
export const PROVISIONED_CLIENT_ID = (firebaseConfig as any)?.oAuthClientId || '';

export interface GoogleUserProfile {
  displayName: string;
  email: string;
  photoURL: string;
}

let cachedAccessToken: string | null = null;
let cachedUserProfile: GoogleUserProfile | null = null;

// Ambil Client ID dari environment jika tersedia
export const getGoogleClientId = (): string => {
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
    (typeof window !== 'undefined' && (window as any).__GOOGLE_CLIENT_ID__) ||
    PROVISIONED_CLIENT_ID ||
    ''
  );
};

export const setGoogleClientId = (clientId: string) => {
  if (typeof window !== 'undefined') {
    (window as any).__GOOGLE_CLIENT_ID__ = clientId;
    try {
      localStorage.setItem('pkl_google_client_id', clientId);
    } catch {}
  }
};

export const getSavedGoogleClientId = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('pkl_google_client_id');
      if (custom) return custom;
    } catch {}
  }
  const envId = getGoogleClientId();
  if (envId) return envId;
  return PROVISIONED_CLIENT_ID;
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    try {
      const storedLocal = localStorage.getItem('pkl_gdrive_access_token');
      if (storedLocal) {
        cachedAccessToken = storedLocal;
        return storedLocal;
      }
      const storedSession = sessionStorage.getItem('pkl_gdrive_access_token');
      if (storedSession) {
        cachedAccessToken = storedSession;
        return storedSession;
      }
    } catch {}
  }
  return null;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem('pkl_gdrive_access_token', token);
        sessionStorage.setItem('pkl_gdrive_access_token', token);
        localStorage.setItem('pkl_gdrive_is_connected', 'true');
      } else {
        localStorage.removeItem('pkl_gdrive_access_token');
        sessionStorage.removeItem('pkl_gdrive_access_token');
        localStorage.removeItem('pkl_gdrive_is_connected');
      }
    } catch {}
  }
};

export const isGoogleDriveLinked = (): boolean => {
  return !!getCachedAccessToken() || !!getConnectedGoogleUser();
};

export const getConnectedGoogleUser = (): GoogleUserProfile | null => {
  if (cachedUserProfile) return cachedUserProfile;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('pkl_gdrive_user_profile');
      if (stored) {
        cachedUserProfile = JSON.parse(stored);
        return cachedUserProfile;
      }
    } catch {}
  }
  return null;
};

export const setConnectedGoogleUser = (user: GoogleUserProfile | null) => {
  cachedUserProfile = user;
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        localStorage.setItem('pkl_gdrive_user_profile', JSON.stringify(user));
      } else {
        localStorage.removeItem('pkl_gdrive_user_profile');
      }
    } catch {}
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch {}
  setCachedAccessToken(null);
  setConnectedGoogleUser(null);
};

/**
 * Listener status autentikasi Google Firebase
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Login langsung dengan Google via Firebase Auth Popup
 */
export const googleSignInWithPopup = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Tidak menerima access token dari Google OAuth.');
    }

    setCachedAccessToken(token);

    if (result.user) {
      setConnectedGoogleUser({
        displayName: result.user.displayName || 'Pengguna Google',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
      });
    }

    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    throw error;
  }
};

/**
 * Muat script Google Identity Services (GSI) jika belum ada
 */
export const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }

    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

/**
 * Meminta Google OAuth Access Token (Mencoba Firebase popup terlebih dahulu, lalu GSI token client)
 */
export const requestGoogleDriveToken = async (customClientId?: string): Promise<string> => {
  // 1. Coba Firebase Auth Popup
  try {
    const res = await googleSignInWithPopup();
    if (res.accessToken) {
      return res.accessToken;
    }
  } catch (firebaseErr: any) {
    console.warn('Firebase signInWithPopup dialihkan ke GSI client jika perlu:', firebaseErr?.message);
    // Jika pengguna sengaja membatalkan popup, langsung sampaikan
    if (firebaseErr?.code === 'auth/popup-closed-by-user') {
      throw new Error('Proses login Google dibatalkan oleh pengguna.');
    }
  }

  // 2. Fallback ke Google Identity Services (GSI) Client
  const clientId = (customClientId || getSavedGoogleClientId()).trim();

  if (!clientId) {
    throw new Error(
      'Google Client ID belum diatur. Masukkan Google Client ID Anda atau gunakan tombol Login Google.'
    );
  }

  await loadGsiScript();

  if (!(window as any).google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK gagal dimuat. Periksa koneksi internet Anda.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          if (tokenResponse.access_token) {
            setCachedAccessToken(tokenResponse.access_token);
            resolve(tokenResponse.access_token);
          } else {
            reject(new Error('Tidak menerima access token dari Google.'));
          }
        },
        error_callback: (nonOAuthError: any) => {
          reject(new Error(nonOAuthError.message || 'Kesalahan otentikasi Google.'));
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(new Error(err.message || 'Gagal memulai dialog Google OAuth.'));
    }
  });
};
