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
  positiveQuotes: string[];
  timeRange: string;
  iconName: 'Sunrise' | 'Sun' | 'Sunset' | 'Moon';
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

/**
 * Koleksi kalimat motivasi & pesan positif harian bervariasi sesuai hari (Senin-Minggu) dan waktu (Pagi/Siang/Sore/Malam)
 */
export const DAILY_POSITIVE_QUOTES: Record<'pagi' | 'siang' | 'sore' | 'malam', { main: string[]; wisdom: string[] }> = {
  pagi: {
    main: [
      // 0: Minggu
      'Pagi yang damai! Siapkan energi positif, luangkan waktu bersyukur, dan rencanakan hari dengan penuh optimisme.',
      // 1: Senin
      'Awali pekan dengan tekad baru! Setiap langkah disiplin dan ikhtiar hari ini adalah investasi masa depan cemerlang.',
      // 2: Selasa
      'Pagi penuh berkah! Tebarkan senyum, kobarkan semangat, dan berikan dedikasi terbaik serta karya nyata membanggakan.',
      // 3: Rabu
      'Teruslah bertumbuh dan belajar hal baru. Kesungguhan, integritas, dan kejujuran adalah kunci sukses sejati.',
      // 4: Kamis
      'Pagi ceria! Disiplin dan konsistensi adalah jembatan emas antara impian besar dan pencapaian nyata.',
      // 5: Jumat
      'Jumat barakah! Awali dengan niat tulus beribadah, perbanyak kebaikan, dan tebarkan manfaat bagi sesama.',
      // 6: Sabtu
      'Tetap produktif dan antusias! Setiap pengalaman berharga hari ini memperkaya wawasan serta keahlian hidup Anda.',
    ],
    wisdom: [
      'Barangsiapa bersungguh-sungguh (Man Jadda Wajada), niscaya ia akan memetik hasilnya.',
      'Memulai hari dengan rasa syukur akan membuka pintu-pintu kemudahan dan rezeki berlimpah.',
      'Disiplin waktu di pagi hari adalah fondasi utama keberhasilan para tokoh besar dunia.',
      'Jadikan setiap tugas sebagai sarana menimba ilmu dan melatih tanggung jawab profesional.',
      'Senyuman hangat dan keramahan di tempat kerja adalah sedekah yang menyebarkan kebahagiaan.',
      'Doa orang tua dan niat yang tulus adalah pelindung terbaik sepanjang aktivitas hari ini.',
      'Kualitas hari ini ditentukan oleh bagaimana kita menyikapi fajar dan memanfaatkan waktu pagi.',
    ],
  },
  siang: {
    main: [
      // 0: Minggu
      'Nikmati siang hari dengan tenang, bersyukur atas nikmat kebersamaan dan kesehatan yang prima.',
      // 1: Senin
      'Jaga fokus dan stamina! Luangkan rehat sejenak, nikmati santap siang bergizi, dan tunaikan sholat Dzuhur tepat waktu.',
      // 2: Selasa
      'Setiap amanah yang diselesaikan dengan teliti dan rapi adalah cermin profesionalisme tinggi.',
      // 3: Rabu
      'Tetap terhidrasi dan jaga konsentrasi. Tetap ramah, santun, dan komunikatif saat bekerja sama.',
      // 4: Kamis
      'Siang produktif! Terus kembangkan keterampilan baru dan jalin hubungan harmonis di lingkungan PKL.',
      // 5: Jumat
      'Tunaikan ibadah Sholat Jumat dan Dzuhur dengan khidmat. Rehat sejenak menyegarkan jiwa dan raga.',
      // 6: Sabtu
      'Manfaatkan siang hari dengan bijak, tetap antusias menyelesaikan amanah dengan hasil optimal.',
    ],
    wisdom: [
      'Menjaga ketepatan waktu ibadah di sela kesibukan adalah bukti kuatnya komitmen spiritual.',
      'Rehat sejenak di tengah hari dapat memulihkan fokus mental dan daya kreativitas hingga 80%.',
      'Komunikasi yang sopan dan santun adalah jembatan tercepat menyelesaikan masalah pekerjaan.',
      'Ketelitian dalam hal kecil membedakan seorang profesional sejati dari yang sekadar bekerja.',
      'Tubuh yang sehat dan jiwa yang tenang adalah modal utama meraih prestasi belajar dan kerja.',
      'Membantu rekan yang membutuhkan bantuan akan melipatgandakan keberkahan rezeki dan ilmu.',
      'Sikap rendah hati saat menerima masukan adalah ciri pribadi yang siap melangkah menjadi pemimpin.',
    ],
  },
  sore: {
    main: [
      // 0: Minggu
      'Menjelang petang hari libur, persiapkan fisik dan mental terbaik menyambut hari esok yang gemilang.',
      // 1: Senin
      'Kerja keras dan ketekunan hari ini sungguh luar biasa! Jangan lupa presensi pulang dan lengkapi jurnal harian.',
      // 2: Selasa
      'Satu hari berhasil dilewati dengan penuh dedikasi. Luangkan waktu sholat Ashar dan syukuri capaian hari ini.',
      // 3: Rabu
      'Apresiasi diri atas setiap pencapaian hari ini. Rapikan tempat kerja dan selesaikan presensi dengan tertib.',
      // 4: Kamis
      'Menjelang petang, pastikan seluruh tanggung jawab tuntas dan selalu utamakan keselamatan saat pulang.',
      // 5: Jumat
      'Alhamdulillah tugas sepekan terlaksana lancar. Selamat menikmati akhir pekan penuh kehangatan bersama keluarga.',
      // 6: Sabtu
      'Sore yang santai dan penuh rasa syukur. Jaga keselamatan serta nikmati momen berharga bersama orang tercinta.',
    ],
    wisdom: [
      'Menutup hari kerja dengan catatan jurnal yang rapi melatih daya refleksi dan akuntabilitas diri.',
      'Utamakan keselamatan di jalan raya: patuhi rambu lalu lintas dan berkendara dengan tenang.',
      'Evaluasi harian adalah rahasia terbaik untuk menjadi pribadi yang lebih baik 1% setiap harinya.',
      'Hati yang bersyukur atas selesainya hari kerja mendatangkan ketenangan batin yang tiada tara.',
      'Lepaskan beban pekerjaan saat tiba di rumah, hadirkan kehangatan dan senyuman bagi keluarga.',
      'Waktu petang adalah momen istimewa untuk berdzikir dan menenangkan pikiran dari kepenatan.',
      'Setiap jerih payah dan keringat yang keluar dalam kebaikan dinilai sebagai ibadah yang mulia.',
    ],
  },
  malam: {
    main: [
      // 0: Minggu
      'Tidur lebih awal malam ini agar bangun esok pagi dalam kondisi segar, bugar, dan bersemangat menyambut pekan baru.',
      // 1: Senin
      'Selamat beristirahat. Lepaskan penat hari ini, bersyukur atas ilmu baru, dan nikmati tidur yang berkualitas.',
      // 2: Selasa
      'Malam tenang dan damai. Pulihkan fisik serta pikiran untuk menyongsong hari esok yang lebih cemerlang.',
      // 3: Rabu
      'Malam adalah waktu terbaik menenangkan jiwa, berdoa, dan menghimpun energi positif untuk esok hari.',
      // 4: Kamis
      'Malam yang penuh ketenangan. Rehat berkualitas adalah investasi terbaik untuk kesehatan jangka panjang.',
      // 5: Jumat
      'Selamat berakhir pekan! Nikmati waktu istirahat yang membahagiakan dan pulihkan tenaga sepenuhnya.',
      // 6: Sabtu
      'Selamat malam dan selamat beristirahat, biarkan tubuh dan pikiran beristirahat optimal tanpa beban.',
    ],
    wisdom: [
      'Tidur yang cukup 7-8 jam sangat penting untuk daya ingat, kekebalan tubuh, dan kestabilan emosi.',
      'Maafkan kesalahan orang lain sebelum memejamkan mata agar hati bersih dan tidur lebih nyenyak.',
      'Menjauhkan layar gadget 30 menit sebelum tidur membantu otak memproduksi hormon melatonin alami.',
      'Doa sebelum tidur adalah penyerahan diri yang menenangkan kepada Sang Pencipta alam semesta.',
      'Esok hari menyimpan sejuta peluang baru bagi mereka yang beristirahat cukup malam ini.',
      'Renungkan satu kebaikan yang telah Anda lakukan hari ini sebagai alasan untuk tersenyum bersyukur.',
      'Istirahat malam yang berkualitas adalah kunci kebugaran saat menyongsong fajar Subuh esok hari.',
    ],
  },
};

export function getTimeGreeting(date: Date = new Date()): TimeGreetingInfo {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const dayOfWeek = date.getDay(); // 0 = Minggu, 1 = Senin, ... 6 = Sabtu

  // 04:00 - 10:59 -> Selamat Pagi
  if (totalMinutes >= 4 * 60 && totalMinutes < 11 * 60) {
    const mainQuote = DAILY_POSITIVE_QUOTES.pagi.main[dayOfWeek] || 'Awali aktivitas dengan semangat dan integritas terbaik.';
    const wisdomQuote = DAILY_POSITIVE_QUOTES.pagi.wisdom[dayOfWeek] || 'Memulai hari dengan rasa syukur membuka pintu kemudahan.';
    return {
      period: 'pagi',
      greeting: 'Selamat Pagi',
      subGreeting: mainQuote,
      positiveQuotes: [
        mainQuote,
        wisdomQuote,
        'Pastikan presensi masuk tercatat tepat waktu dan jaga kedisiplinan.',
      ],
      timeRange: '04:00 - 10:59 WIB',
      iconName: 'Sunrise',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
      badgeBorder: 'border-amber-400/40 dark:border-amber-500/30',
      badgeText: 'text-amber-700 dark:text-amber-300',
    };
  }

  // 11:00 - 14:59 -> Selamat Siang
  if (totalMinutes >= 11 * 60 && totalMinutes < 15 * 60) {
    const mainQuote = DAILY_POSITIVE_QUOTES.siang.main[dayOfWeek] || 'Jaga fokus di tempat magang dan luangkan rehat secukupnya.';
    const wisdomQuote = DAILY_POSITIVE_QUOTES.siang.wisdom[dayOfWeek] || 'Menjaga ketepatan waktu ibadah adalah bukti integritas.';
    return {
      period: 'siang',
      greeting: 'Selamat Siang',
      subGreeting: mainQuote,
      positiveQuotes: [
        mainQuote,
        wisdomQuote,
        'Luangkan rehat secukupnya, makan siang bergizi, dan tunaikan sholat Dzuhur.',
      ],
      timeRange: '11:00 - 14:59 WIB',
      iconName: 'Sun',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/50',
      badgeBorder: 'border-sky-400/40 dark:border-sky-500/30',
      badgeText: 'text-sky-700 dark:text-sky-300',
    };
  }

  // 15:00 - 18:29 -> Selamat Sore
  if (totalMinutes >= 15 * 60 && totalMinutes < 18 * 60 + 30) {
    const mainQuote = DAILY_POSITIVE_QUOTES.sore.main[dayOfWeek] || 'Pastikan presensi pulang tercatat dan jurnal harian terisi rapi.';
    const wisdomQuote = DAILY_POSITIVE_QUOTES.sore.wisdom[dayOfWeek] || 'Menutup hari kerja dengan catatan jurnal melatih akuntabilitas.';
    return {
      period: 'sore',
      greeting: 'Selamat Sore',
      subGreeting: mainQuote,
      positiveQuotes: [
        mainQuote,
        wisdomQuote,
        'Pastikan presensi pulang tercatat dan selalu utamakan keselamatan berkendara di jalan.',
      ],
      timeRange: '15:00 - 18:29 WIB',
      iconName: 'Sunset',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/50',
      badgeBorder: 'border-orange-400/40 dark:border-orange-500/30',
      badgeText: 'text-orange-700 dark:text-orange-300',
    };
  }

  // 18:30 - 03:59 -> Selamat Malam
  const mainQuote = DAILY_POSITIVE_QUOTES.malam.main[dayOfWeek] || 'Selamat beristirahat dan pulihkan energi untuk aktivitas esok hari.';
  const wisdomQuote = DAILY_POSITIVE_QUOTES.malam.wisdom[dayOfWeek] || 'Tidur yang cukup sangat penting untuk daya ingat dan kesehatan tubuh.';
  return {
    period: 'malam',
    greeting: 'Selamat Malam',
    subGreeting: mainQuote,
    positiveQuotes: [
      mainQuote,
      wisdomQuote,
      'Rehat berkualitas adalah investasi terbaik untuk stamina dan produktivitas esok hari.',
    ],
    timeRange: '18:30 - 03:59 WIB',
    iconName: 'Moon',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    badgeBorder: 'border-indigo-400/40 dark:border-indigo-500/30',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
  };
}
