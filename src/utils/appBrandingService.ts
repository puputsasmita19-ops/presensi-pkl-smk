import { useState, useEffect, useCallback } from 'react';
import { compressDataUrl, compressImageFile } from './imageCompressor';

export type LogoPresetType = 'toga' | 'tutwuri' | 'gedung' | 'bintang' | 'presensi' | 'custom';

export interface AppBrandingConfig {
  appName: string;
  appTagline: string;
  schoolName: string;
  logoUrl: string; // Base64 Data URL or remote image URL
  logoPreset: LogoPresetType;
  updatedAt?: string;
}

export const STORAGE_KEY_BRANDING = 'pkl_app_branding_config';
export const BRANDING_UPDATE_EVENT = 'pkl_app_branding_update';

export const DEFAULT_BRANDING_CONFIG: AppBrandingConfig = {
  appName: 'Presensi PKL SMK',
  appTagline: 'Sistem Presensi & Jurnal Praktik Kerja Lapangan',
  schoolName: 'SMK Negeri 1 Surabaya',
  logoUrl: '',
  logoPreset: 'toga',
};

/**
 * Membaca konfigurasi branding dari localStorage dengan fallback ke default
 */
export function getAppBrandingConfig(): AppBrandingConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_BRANDING_CONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRANDING);
    if (!raw) return DEFAULT_BRANDING_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      appName: parsed.appName?.trim() || DEFAULT_BRANDING_CONFIG.appName,
      appTagline: parsed.appTagline?.trim() || DEFAULT_BRANDING_CONFIG.appTagline,
      schoolName: parsed.schoolName?.trim() || DEFAULT_BRANDING_CONFIG.schoolName,
      logoUrl: parsed.logoUrl || '',
      logoPreset: parsed.logoPreset || 'toga',
      updatedAt: parsed.updatedAt,
    };
  } catch (err) {
    console.warn('Gagal memuat branding dari localStorage:', err);
    return DEFAULT_BRANDING_CONFIG;
  }
}

/**
 * Menyimpan konfigurasi branding dan menyiarkan event reaktif ke seluruh komponen
 */
export function saveAppBrandingConfig(partial: Partial<AppBrandingConfig>): AppBrandingConfig {
  const current = getAppBrandingConfig();
  const updated: AppBrandingConfig = {
    ...current,
    ...partial,
    appName: (partial.appName !== undefined ? partial.appName.trim() : current.appName) || DEFAULT_BRANDING_CONFIG.appName,
    appTagline: partial.appTagline !== undefined ? partial.appTagline.trim() : current.appTagline,
    schoolName: partial.schoolName !== undefined ? partial.schoolName.trim() : current.schoolName,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATE_EVENT, { detail: updated }));
      // Perbarui judul tab browser
      if (document && updated.appName) {
        document.title = `${updated.appName} - Sistem Presensi & Jurnal PKL`;
      }
    } catch (err) {
      console.error('Gagal menyimpan branding:', err);
    }
  }

  return updated;
}

/**
 * Mengembalikan konfigurasi branding ke nilai bawaan
 */
export function resetAppBrandingConfig(): AppBrandingConfig {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_BRANDING);
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATE_EVENT, { detail: DEFAULT_BRANDING_CONFIG }));
      if (document) {
        document.title = `${DEFAULT_BRANDING_CONFIG.appName} - Sistem Presensi & Jurnal PKL`;
      }
    } catch (err) {
      console.error('Gagal mereset branding:', err);
    }
  }
  return DEFAULT_BRANDING_CONFIG;
}

/**
 * Kompresi file logo agar ringan dan pas disimpan di localStorage (<150 KB)
 */
export async function processLogoUpload(file: File): Promise<string> {
  // Jika SVG, baca langsung sebagai data URL tanpa kompresi canvas agar vektor tetap tajam
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca berkas SVG'));
      reader.readAsDataURL(file);
    });
  }

  // Untuk PNG/JPEG/WebP, kompres dengan ukuran max 360x360
  const result = await compressImageFile(file, undefined, {
    maxWidth: 360,
    maxHeight: 360,
    quality: 0.85,
    mimeType: file.type === 'image/png' ? 'image/jpeg' : 'image/jpeg',
  });
  return result.dataUrl;
}

/**
 * Custom React Hook untuk sinkronisasi state branding secara reaktif
 */
export function useAppBranding() {
  const [branding, setBranding] = useState<AppBrandingConfig>(() => getAppBrandingConfig());

  useEffect(() => {
    // Sinkronisasi judul awal
    if (typeof document !== 'undefined' && branding.appName) {
      document.title = `${branding.appName} - Sistem Presensi & Jurnal PKL`;
    }

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AppBrandingConfig>;
      if (customEvent.detail) {
        setBranding(customEvent.detail);
      } else {
        setBranding(getAppBrandingConfig());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_BRANDING) {
        setBranding(getAppBrandingConfig());
      }
    };

    window.addEventListener(BRANDING_UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(BRANDING_UPDATE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [branding.appName]);

  const updateBranding = useCallback((partial: Partial<AppBrandingConfig>) => {
    const updated = saveAppBrandingConfig(partial);
    setBranding(updated);
    return updated;
  }, []);

  const resetBranding = useCallback(() => {
    const reset = resetAppBrandingConfig();
    setBranding(reset);
    return reset;
  }, []);

  return {
    branding,
    updateBranding,
    resetBranding,
  };
}

/**
 * Helper ucapan waktu: Pagi, Siang, Sore, Malam
 */
export interface TimeGreetingInfo {
  period: 'pagi' | 'siang' | 'sore' | 'malam';
  greeting: string;
  subGreeting: string;
  timeRange: string;
  iconName: 'Sunrise' | 'Sun' | 'Sunset' | 'Moon';
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export function getTimeGreeting(date: Date = new Date()): TimeGreetingInfo {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 04:00 - 10:59 -> Selamat Pagi
  if (totalMinutes >= 4 * 60 && totalMinutes < 11 * 60) {
    return {
      period: 'pagi',
      greeting: 'Selamat Pagi',
      subGreeting: 'Awali aktivitas dengan semangat dan integritas terbaik.',
      timeRange: '04:00 - 10:59 WIB',
      iconName: 'Sunrise',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
      badgeBorder: 'border-amber-400/40 dark:border-amber-500/30',
      badgeText: 'text-amber-700 dark:text-amber-300',
    };
  }

  // 11:00 - 14:59 -> Selamat Siang
  if (totalMinutes >= 11 * 60 && totalMinutes < 15 * 60) {
    return {
      period: 'siang',
      greeting: 'Selamat Siang',
      subGreeting: 'Jaga fokus di tempat magang dan luangkan rehat secukupnya.',
      timeRange: '11:00 - 14:59 WIB',
      iconName: 'Sun',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/50',
      badgeBorder: 'border-sky-400/40 dark:border-sky-500/30',
      badgeText: 'text-sky-700 dark:text-sky-300',
    };
  }

  // 15:00 - 18:29 -> Selamat Sore
  if (totalMinutes >= 15 * 60 && totalMinutes < 18 * 60 + 30) {
    return {
      period: 'sore',
      greeting: 'Selamat Sore',
      subGreeting: 'Pastikan presensi pulang tercatat dan jurnal harian terisi rapi.',
      timeRange: '15:00 - 18:29 WIB',
      iconName: 'Sunset',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/50',
      badgeBorder: 'border-orange-400/40 dark:border-orange-500/30',
      badgeText: 'text-orange-700 dark:text-orange-300',
    };
  }

  // 18:30 - 03:59 -> Selamat Malam
  return {
    period: 'malam',
    greeting: 'Selamat Malam',
    subGreeting: 'Selamat beristirahat dan pulihkan energi untuk aktivitas esok hari.',
    timeRange: '18:30 - 03:59 WIB',
    iconName: 'Moon',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    badgeBorder: 'border-indigo-400/40 dark:border-indigo-500/30',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
  };
}
