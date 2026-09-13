/**
 * Layanan Autentikasi Google OAuth untuk Google Drive API
 * Tanpa ketergantungan pada Firebase (Pure Client-Side OAuth2 Token Management)
 */

let cachedAccessToken: string | null = null;

// Ambil Client ID dari environment jika tersedia
export const getGoogleClientId = (): string => {
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
    (typeof window !== 'undefined' && (window as any).__GOOGLE_CLIENT_ID__) ||
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
  const envId = getGoogleClientId();
  if (envId) return envId;
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('pkl_google_client_id') || '';
    } catch {}
  }
  return '';
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('pkl_gdrive_access_token');
      if (stored) {
        cachedAccessToken = stored;
        return stored;
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
        sessionStorage.setItem('pkl_gdrive_access_token', token);
      } else {
        sessionStorage.removeItem('pkl_gdrive_access_token');
      }
    } catch {}
  }
};

export const logoutGoogle = () => {
  setCachedAccessToken(null);
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
 * Meminta Google OAuth Access Token menggunakan Google Identity Services
 */
export const requestGoogleDriveToken = async (customClientId?: string): Promise<string> => {
  const clientId = (customClientId || getSavedGoogleClientId()).trim();

  if (!clientId) {
    throw new Error(
      'Google Client ID belum diatur. Masukkan Google Client ID Anda atau gunakan input token manual.'
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
