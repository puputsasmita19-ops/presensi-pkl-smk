/**
 * Utility Kompresi Citra Otomatis (Automatic Image Compressor)
 * Mengoptimalkan foto selfie presensi dan dokumentasi supervisi sebelum disimpan ke database / cloud.
 * Mengurangi ukuran file dari 3-10 MB menjadi ~40-90 KB (hemat hingga 95%+) tanpa kehilangan detail wajah dan tanda air.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 s.d. 1.0 (default: 0.70 untuk hemat ruang optimal)
  mimeType?: 'image/jpeg' | 'image/webp';
}

export type CompressionPreset = 'eco' | 'balanced' | 'high';

export interface CompressPresetInfo extends CompressOptions {
  name: string;
  estimatedSize: string;
  description: string;
}

export const COMPRESSION_PRESETS: Record<CompressionPreset, CompressPresetInfo> = {
  // Mode Super Hemat (Cocok untuk kuota hemat & database/drive sangat ramping, ~35-50 KB)
  eco: {
    name: 'Super Hemat',
    estimatedSize: '~35-50 KB / foto',
    description: 'Ukuran file terkecil, sangat menghemat kuota internet dan kuota Drive.',
    maxWidth: 600,
    maxHeight: 600,
    quality: 0.65,
    mimeType: 'image/jpeg',
  },
  // Mode Seimbang (Rekomendasi default: resolusi tajam, tanda air jernih, ~50-75 KB, hemat >90%)
  balanced: {
    name: 'Seimbang (Default)',
    estimatedSize: '~50-75 KB / foto',
    description: 'Rekomendasi terbaik: wajah jelas, tanda air tajam, hemat ruang hingga 95%.',
    maxWidth: 720,
    maxHeight: 720,
    quality: 0.72,
    mimeType: 'image/jpeg',
  },
  // Mode Kualitas Tinggi (800px, ~80-120 KB)
  high: {
    name: 'Kualitas Tinggi',
    estimatedSize: '~80-120 KB / foto',
    description: 'Resolusi lebih tinggi untuk arsip sertifikasi atau dokumentasi resmi.',
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.82,
    mimeType: 'image/jpeg',
  },
};

const STORAGE_KEY_COMPRESS_PRESET = 'pkl_compression_preset';

export function getSavedCompressionPreset(): CompressionPreset {
  if (typeof window === 'undefined') return 'balanced';
  const val = localStorage.getItem(STORAGE_KEY_COMPRESS_PRESET) as CompressionPreset;
  return val && COMPRESSION_PRESETS[val] ? val : 'balanced';
}

export function setSavedCompressionPreset(preset: CompressionPreset): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_COMPRESS_PRESET, preset);
}

export function getActiveCompressOptions(): CompressOptions {
  const preset = getSavedCompressionPreset();
  return COMPRESSION_PRESETS[preset] || COMPRESSION_PRESETS.balanced;
}

export interface CompressionResult {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  ratioPercent: number; // e.g. 94 (hemat 94%)
  width: number;
  height: number;
}

export interface WatermarkData {
  title: string; // e.g. "SISWA PKL: REZA PRATAMA"
  subtitle: string; // e.g. "PT Telkom • 13/09/2026 08:00 WIB • GPS Valid"
}

/**
 * Menghitung perkiraan ukuran string Base64 Data URL dalam Kilobyte (KB)
 */
export function getBase64SizeKB(base64DataUrl: string): number {
  if (!base64DataUrl) return 0;
  const parts = base64DataUrl.split(',');
  const base64Str = parts[1] || parts[0];
  // 4 karakter base64 = 3 bytes
  const bytes = (base64Str.length * 3) / 4;
  return Math.round((bytes / 1024) * 10) / 10;
}

/**
 * Format ukuran KB menjadi teks yang mudah dibaca (misal "84 KB" atau "2.4 MB")
 */
export function formatKB(kb: number): string {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(kb)} KB`;
}

/**
 * Mengompresi file foto (dari input type="file" atau tangkapan kamera ponsel)
 */
export async function compressImageFile(
  file: File,
  watermark?: WatermarkData,
  options?: CompressOptions
): Promise<CompressionResult> {
  const originalSizeKB = Math.round((file.size / 1024) * 10) / 10;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Gagal membaca file gambar'));
        return;
      }
      compressDataUrl(dataUrl, originalSizeKB, watermark, options)
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = () => reject(new Error('Gagal membaca input file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Mengompresi Data URL gambar yang sudah ada (misal tangkapan webcam live stream)
 */
export async function compressDataUrl(
  dataUrl: string,
  knownOriginalSizeKB?: number,
  watermark?: WatermarkData,
  options?: CompressOptions
): Promise<CompressionResult> {
  const activeOpts = options || getActiveCompressOptions();
  const maxWidth = activeOpts.maxWidth || 720;
  const maxHeight = activeOpts.maxHeight || 720;
  const quality = activeOpts.quality !== undefined ? activeOpts.quality : 0.72;
  const mimeType = activeOpts.mimeType || 'image/jpeg';

  const origKB = knownOriginalSizeKB || getBase64SizeKB(dataUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width || 640;
        let height = img.naturalHeight || img.height || 480;

        // Hitung skala rasio agar tidak melebihi maxWidth / maxHeight
        let ratio = 1;
        if (width > maxWidth || height > maxHeight) {
          ratio = Math.min(maxWidth / width, maxHeight / height);
        }

        const targetW = Math.max(320, Math.round(width * ratio));
        const targetH = Math.max(240, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback jika canvas context gagal
          resolve({
            dataUrl,
            originalSizeKB: origKB,
            compressedSizeKB: origKB,
            ratioPercent: 0,
            width,
            height,
          });
          return;
        }

        // Kualitas rendering canvas tingkat tinggi
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Gambar foto yang telah di-resize
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Jika ada data watermark, bubuhkan di bagian bawah foto
        if (watermark) {
          const bannerHeight = Math.max(50, Math.round(targetH * 0.13));
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(0, targetH - bannerHeight, targetW, bannerHeight);

          // Garis aksen biru atas banner
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(0, targetH - bannerHeight, targetW, 2);

          // Judul / Nama
          ctx.fillStyle = '#38bdf8';
          const titleFontSize = Math.max(11, Math.round(targetW * 0.026));
          ctx.font = `bold ${titleFontSize}px sans-serif`;
          ctx.fillText(
            watermark.title,
            12,
            targetH - bannerHeight + Math.round(bannerHeight * 0.42)
          );

          // Subtitle / Tanggal, Jam & Info Lokasi
          ctx.fillStyle = '#f8fafc';
          const subFontSize = Math.max(10, Math.round(targetW * 0.021));
          ctx.font = `${subFontSize}px sans-serif`;
          ctx.fillText(
            watermark.subtitle,
            12,
            targetH - bannerHeight + Math.round(bannerHeight * 0.82)
          );
        }

        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        const compKB = getBase64SizeKB(compressedDataUrl);

        const ratioPercent =
          origKB > 0 && origKB > compKB
            ? Math.round(((origKB - compKB) / origKB) * 100)
            : 0;

        resolve({
          dataUrl: compressedDataUrl,
          originalSizeKB: origKB,
          compressedSizeKB: compKB,
          ratioPercent,
          width: targetW,
          height: targetH,
        });
      } catch (err) {
        console.warn('Kompresi canvas mengalami fallback:', err);
        resolve({
          dataUrl,
          originalSizeKB: origKB,
          compressedSizeKB: origKB,
          ratioPercent: 0,
          width: 640,
          height: 480,
        });
      }
    };

    img.onerror = () => {
      resolve({
        dataUrl,
        originalSizeKB: origKB,
        compressedSizeKB: origKB,
        ratioPercent: 0,
        width: 640,
        height: 480,
      });
    };

    img.src = dataUrl;
  });
}
