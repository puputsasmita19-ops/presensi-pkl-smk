/**
 * Layanan Autentikasi Google OAuth Murni (Google Identity Services - GSI)
 * untuk Integrasi Penyimpanan Google Drive API.
 * Bebas dari Firebase & Mendukung Penyimpanan Google Drive Mandiri.
 */

export interface GoogleUserProfile {
  displayName: string;
  email: string;
  photoURL: string;
}

// OAuth Client ID Default untuk Google Drive Access
export const DEFAULT_GOOGLE_CLIENT_ID =
  '46900601033-t50267uivq38l571ug1jrqntn3p9rdd7.apps.googleusercontent.com';

let cachedAccessToken: string | null = null;
let cachedUserProfile: GoogleUserProfile | null = null;

// Ambil Client ID dari environment atau setting pengguna
export const getGoogleClientId = (): string => {
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
    (typeof window !== 'undefined' && (window as any).__GOOGLE_CLIENT_ID__) ||
    DEFAULT_GOOGLE_CLIENT_ID
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
      if (custom && custom.trim()) return custom.trim();
    } catch {}
  }
  const envId = getGoogleClientId();
  if (envId && envId.trim()) return envId.trim();
  return DEFAULT_GOOGLE_CLIENT_ID;
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
  const token = getCachedAccessToken();
  if (token && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    try {
      (window as any).google.accounts.oauth2.revoke(token, () => {});
    } catch {}
  }
  setCachedAccessToken(null);
  setConnectedGoogleUser(null);
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
 * Parse Google ID Token (JWT) dari Google Sign-In
 */
export const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Gagal decode Google JWT ID Token:', e);
    return null;
  }
};

/**
 * Inisialisasi Google One Tap / Sign In Button standar Google Identity Services
 */
export const renderGoogleSignInButton = async (
  elementId: string,
  onSuccess: (profile: GoogleUserProfile, idToken: string) => void,
  customClientId?: string
) => {
  const clientId = (customClientId || getSavedGoogleClientId()).trim();
  if (!clientId || typeof window === 'undefined') return;

  await loadGsiScript();

  if ((window as any).google?.accounts?.id) {
    (window as any).google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response: any) => {
        if (response.credential) {
          const payload = parseJwt(response.credential);
          if (payload) {
            const profile: GoogleUserProfile = {
              displayName: payload.name || payload.given_name || 'Pengguna Google',
              email: payload.email || '',
              photoURL: payload.picture || '',
            };
            setConnectedGoogleUser(profile);
            setCachedAccessToken(response.credential);
            onSuccess(profile, response.credential);
          }
        }
      },
    });

    const targetEl = document.getElementById(elementId);
    if (targetEl) {
      targetEl.innerHTML = '';
      (window as any).google.accounts.id.renderButton(targetEl, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'signin_with',
        logo_alignment: 'left',
        width: 320,
      });
    }
  }
};

/**
 * Mengambil profil info pengguna dari Google UserInfo endpoint
 */
export const fetchGoogleUserProfile = async (token: string): Promise<GoogleUserProfile | null> => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        displayName: data.name || data.given_name || 'Pengguna Google',
        email: data.email || '',
        photoURL: data.picture || '',
      };
    }
  } catch (err) {
    console.warn('Gagal memuat profil Google:', err);
  }
  return null;
};

/**
 * Meminta Google OAuth Access Token menggunakan Google Identity Services (GSI)
 * untuk akses penyimpanan Google Drive (https://www.googleapis.com/auth/drive.file)
 */
export const requestGoogleDriveToken = async (customClientId?: string): Promise<string> => {
  const clientId = (customClientId || getSavedGoogleClientId()).trim();

  if (!clientId) {
    throw new Error(
      'Google Client ID belum diatur. Masukkan Google Client ID OAuth 2.0 Anda di modal.'
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
        // Scope Google Drive file dan profil
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            // Jika ada pembatasan scope, coba fallback profil
            if (tokenResponse.error === 'invalid_scope' || tokenResponse.error === 'access_denied') {
              try {
                const fallbackClient = (window as any).google.accounts.oauth2.initTokenClient({
                  client_id: clientId,
                  scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                  callback: async (fallbackResp: any) => {
                    if (fallbackResp.access_token) {
                      setCachedAccessToken(fallbackResp.access_token);
                      try {
                        const profile = await fetchGoogleUserProfile(fallbackResp.access_token);
                        if (profile) setConnectedGoogleUser(profile);
                      } catch {}
                      resolve(fallbackResp.access_token);
                    } else {
                      reject(new Error(fallbackResp.error_description || fallbackResp.error || 'Akses Google ditolak.'));
                    }
                  },
                });
                fallbackClient.requestAccessToken();
                return;
              } catch {}
            }
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          if (tokenResponse.access_token) {
            const token = tokenResponse.access_token;
            setCachedAccessToken(token);

            // Muat profil user secara background
            try {
              const profile = await fetchGoogleUserProfile(token);
              if (profile) {
                setConnectedGoogleUser(profile);
              }
            } catch {}

            resolve(token);
          } else {
            reject(new Error('Tidak menerima access token dari Google.'));
          }
        },
        error_callback: (nonOAuthError: any) => {
          reject(new Error(nonOAuthError.message || 'Kesalahan otentikasi Google.'));
        },
      });

      client.requestAccessToken();
    } catch (err: any) {
      reject(new Error(err.message || 'Gagal memulai dialog Google OAuth.'));
    }
  });
};

// Backward-compatibility alias
export const PROVISIONED_CLIENT_ID = DEFAULT_GOOGLE_CLIENT_ID;
