// Layanan integrasi API MySQL Online
import { Siswa, DUDI, Presensi, JurnalHarian } from '../types';

export interface DbStatusResponse {
  connected: boolean;
  configured: boolean;
  database?: string;
  host?: string;
  message: string;
}

export const checkDbConnection = async (): Promise<DbStatusResponse> => {
  try {
    const res = await fetch('/api/db/status');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        connected: false,
        configured: data.configured ?? false,
        message: data.message || `Gagal memeriksa koneksi (HTTP ${res.status})`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      configured: false,
      message: 'Server backend belum aktif atau tidak dapat dijangkau.',
    };
  }
};

// SISWA
export const fetchSiswaFromDb = async (): Promise<Siswa[] | null> => {
  try {
    const res = await fetch('/api/siswa');
    if (!res.ok) return null;
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
    return await res.json();
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
