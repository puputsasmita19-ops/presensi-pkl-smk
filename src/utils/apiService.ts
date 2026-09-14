// Layanan integrasi API MySQL Online & Vercel Serverless
import { Siswa, DUDI, Presensi, JurnalHarian, KunjunganGuru } from '../types';

export interface DbStatusResponse {
  connected: boolean;
  configured: boolean;
  database?: string;
  host?: string;
  port?: number;
  ssl?: boolean;
  latencyMs?: number;
  tables?: string[];
  isTiDB?: boolean;
  version?: string;
  message: string;
}

// Helper aman parsing JSON (mencegah error jika server proxy mengembalikan HTML 404/500)
async function safeJsonParse<T>(res: Response): Promise<T | null> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      // Coba parse manual jika text berformat JSON
      if (text && (text.startsWith('{') || text.startsWith('['))) {
        return JSON.parse(text) as T;
      }
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const checkDbConnection = async (): Promise<DbStatusResponse> => {
  try {
    const res = await fetch('/api/db/status');
    const data = await safeJsonParse<DbStatusResponse>(res);
    if (!res.ok || !data) {
      return {
        connected: false,
        configured: data?.configured ?? false,
        isTiDB: data?.isTiDB ?? false,
        message: data?.message || `Gagal memeriksa koneksi (HTTP ${res.status})`,
      };
    }
    return data;
  } catch (err: any) {
    return {
      connected: false,
      configured: false,
      isTiDB: false,
      message: 'Server backend / Vercel API belum dapat dijangkau.',
    };
  }
};

// MASS SYNC: Kirim semua data lokal ke MySQL / TiDB
export interface SyncAllPayload {
  siswa: Siswa[];
  dudi: DUDI[];
  presensi: Presensi[];
  jurnal: JurnalHarian[];
  kunjungan?: KunjunganGuru[];
}

export interface SyncAllResult {
  success: boolean;
  message: string;
  syncedCounts?: {
    siswa: number;
    dudi: number;
    presensi: number;
    jurnal: number;
    kunjungan?: number;
  };
}

export const uploadPhotoToServer = async (
  photoBase64: string,
  id: string,
  prefix: 'selfie' | 'kunjungan' | 'foto' = 'foto'
): Promise<{ success: boolean; url?: string; fileName?: string; error?: string }> => {
  try {
    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo: photoBase64, id, prefix }),
    });
    const data = await safeJsonParse<{ success: boolean; url?: string; fileName?: string; error?: string }>(res);
    if (!res.ok || !data) {
      return { success: false, error: data?.error || `Upload gagal (HTTP ${res.status})` };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Koneksi upload foto terputus' };
  }
};

export const syncAllDataToDb = async (payload: SyncAllPayload): Promise<SyncAllResult> => {
  try {
    const res = await fetch('/api/db/sync-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeJsonParse<SyncAllResult>(res);
    if (!res.ok || !data) {
      return {
        success: false,
        message: data?.message || `Gagal sinkronisasi (HTTP ${res.status})`,
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Koneksi ke backend terputus saat sinkronisasi.',
    };
  }
};

// SISWA
export const fetchSiswaFromDb = async (): Promise<Siswa[] | null> => {
  try {
    const res = await fetch('/api/siswa');
    if (!res.ok) return null;
    return await safeJsonParse<Siswa[]>(res);
  } catch {
    return null;
  }
};

export const saveSiswaToDb = async (siswa: Siswa): Promise<boolean> => {
  try {
    const res = await fetch('/api/siswa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siswa),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const deleteSiswaFromDb = async (id_siswa: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/siswa/${id_siswa}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
};

// DUDI
export const fetchDudiFromDb = async (): Promise<DUDI[] | null> => {
  try {
    const res = await fetch('/api/dudi');
    if (!res.ok) return null;
    return await safeJsonParse<DUDI[]>(res);
  } catch {
    return null;
  }
};

export const saveDudiToDb = async (dudi: DUDI): Promise<boolean> => {
  try {
    const res = await fetch('/api/dudi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dudi),
    });
    return res.ok;
  } catch {
    return false;
  }
};

// PRESENSI
export const fetchPresensiFromDb = async (): Promise<Presensi[] | null> => {
  try {
    const res = await fetch('/api/presensi');
    if (!res.ok) return null;
    return await safeJsonParse<Presensi[]>(res);
  } catch {
    return null;
  }
};

export const savePresensiToDb = async (presensi: Presensi): Promise<boolean> => {
  try {
    const res = await fetch('/api/presensi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(presensi),
    });
    return res.ok;
  } catch {
    return false;
  }
};

// JURNAL
export const fetchJurnalFromDb = async (): Promise<JurnalHarian[] | null> => {
  try {
    const res = await fetch('/api/jurnal');
    if (!res.ok) return null;
    return await safeJsonParse<JurnalHarian[]>(res);
  } catch {
    return null;
  }
};

export const saveJurnalToDb = async (jurnal: JurnalHarian): Promise<boolean> => {
  try {
    const res = await fetch('/api/jurnal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jurnal),
    });
    return res.ok;
  } catch {
    return false;
  }
};

// KUNJUNGAN GURU
export const fetchKunjunganFromDb = async (): Promise<KunjunganGuru[] | null> => {
  try {
    const res = await fetch('/api/kunjungan');
    if (!res.ok) return null;
    return await safeJsonParse<KunjunganGuru[]>(res);
  } catch {
    return null;
  }
};

export const saveKunjunganToDb = async (kunjungan: KunjunganGuru): Promise<boolean> => {
  try {
    const res = await fetch('/api/kunjungan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kunjungan),
    });
    return res.ok;
  } catch {
    return false;
  }
};
