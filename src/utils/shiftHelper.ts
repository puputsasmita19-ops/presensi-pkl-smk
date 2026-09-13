import { DUDI, ShiftKerja, StatusKetepatan } from '../types';

export const NAMA_HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

/**
 * Get Indonesian day name from date object or ISO date string (YYYY-MM-DD)
 */
export function getNamaHari(dateInput?: Date | string): string {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput === 'string') {
    // If string is YYYY-MM-DD, parse year, month, day to avoid timezone drift
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  const dayIndex = date.getDay();
  return NAMA_HARI_INDONESIA[dayIndex];
}

/**
 * Check if a given day name is in DUDI's active work days
 */
export function isHariKerjaDUDI(dudi: DUDI, namaHari: string): boolean {
  if (!dudi.hari_kerja || dudi.hari_kerja.length === 0) return true;
  return dudi.hari_kerja.includes(namaHari);
}

/**
 * Convert "HH:mm" or "HH:mm:ss" string to minutes from 00:00
 */
export function timeStrToMinutes(timeStr: string): number {
  if (!timeStr || timeStr === '-') return 0;
  const [hh, mm] = timeStr.split(':').map((s) => parseInt(s, 10));
  return (isNaN(hh) ? 0 : hh * 60) + (isNaN(mm) ? 0 : mm);
}

/**
 * Calculate punctuality status against shift scheduled start time
 */
export function calculateKetepatan(
  jamMasukAktual: string,
  jadwalMasuk: string,
  toleransiMenit: number = 15
): { status: StatusKetepatan; selisihMenit: number; deskripsi: string } {
  if (!jamMasukAktual || jamMasukAktual === '-' || !jadwalMasuk) {
    return { status: 'Tepat Waktu', selisihMenit: 0, deskripsi: 'Tepat Waktu' };
  }

  const actualMinutes = timeStrToMinutes(jamMasukAktual);
  const targetMinutes = timeStrToMinutes(jadwalMasuk);

  const selisih = actualMinutes - targetMinutes;

  if (selisih <= 0) {
    return {
      status: 'Tepat Waktu',
      selisihMenit: Math.abs(selisih),
      deskripsi: selisih === 0 ? 'Tepat Waktu' : `Lebih Awal ${Math.abs(selisih)} Menit`,
    };
  } else if (selisih <= toleransiMenit) {
    return {
      status: 'Tepat Waktu',
      selisihMenit: selisih,
      deskripsi: `Dalam Batas Toleransi (+${selisih} Menit)`,
    };
  } else {
    return {
      status: 'Terlambat',
      selisihMenit: selisih,
      deskripsi: `Terlambat ${selisih} Menit`,
    };
  }
}

/**
 * Find default / recommended shift for student at current moment
 */
export function getRecommendedShift(dudi: DUDI, namaHari: string, nowTimeStr?: string): ShiftKerja {
  const shifts = dudi.daftar_shift || [];
  if (shifts.length === 0) {
    return {
      id_shift: 'DEFAULT-REG',
      nama_shift: 'Jam Kerja Standar',
      jam_masuk: dudi.jam_masuk_standar || '08:00',
      jam_pulang: dudi.jam_pulang_standar || '16:30',
      toleransi_keterlambatan_menit: 15,
    };
  }

  // 1. If Kondisional, check if any shift matches today's day
  if (dudi.tipe_jadwal === 'Kondisional') {
    const matched = shifts.find((s) => s.hari_khusus && s.hari_khusus.includes(namaHari));
    if (matched) return matched;
  }

  // 2. If Shift system, match closest start time
  if (dudi.tipe_jadwal === 'Shift' && nowTimeStr) {
    const currentMins = timeStrToMinutes(nowTimeStr);
    // Find shift whose start time is closest (or within +/- 2 hours)
    let bestShift = shifts[0];
    let minDiff = Infinity;

    for (const shift of shifts) {
      const shiftMins = timeStrToMinutes(shift.jam_masuk);
      const diff = Math.abs(currentMins - shiftMins);
      if (diff < minDiff) {
        minDiff = diff;
        bestShift = shift;
      }
    }
    return bestShift;
  }

  // Fallback to first shift
  return shifts[0];
}
