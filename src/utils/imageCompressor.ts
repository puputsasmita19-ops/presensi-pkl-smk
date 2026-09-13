/**
 * Utility Kompresi Citra Otomatis (Automatic Image Compressor)
 * Mengoptimalkan foto selfie presensi dan dokumentasi supervisi sebelum disimpan ke database / cloud.
 * Mengurangi ukuran file dari 3-10 MB menjadi ~40-90 KB (hemat hingga 95%+) tanpa kehilangan detail wajah dan tanda air.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 s.d. 1.0 (default: 0.78)
  mimeType?: 'image/jpeg' | 'image/webp';
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
  const maxWidth = options?.maxWidth || 720;
  const maxHeight = options?.maxHeight || 720;
  const quality = options?.quality !== undefined ? options?.quality : 0.78;
  const mimeType = options?.mimeType || 'image/jpeg';

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
