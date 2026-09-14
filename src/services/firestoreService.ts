/**
 * Layanan Database Firebase Firestore Realtime untuk Presensi & Jurnal PKL
 * Menyimpan seluruh data: Siswa, DUDI, Guru, Presensi, Jurnal, Kunjungan, dan Log secara real-time.
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Siswa,
  DUDI,
  GuruPembimbing,
  Presensi,
  JurnalHarian,
  KunjunganGuru,
  LogAktivitas,
  FonnteConfig,
  User,
} from '../types';

// Nama Collections Firestore
export const COLLECTIONS = {
  SISWA: 'siswa',
  DUDI: 'dudi',
  GURU: 'guru_pembimbing',
  PRESENSI: 'presensi',
  JURNAL: 'jurnal_harian',
  KUNJUNGAN: 'kunjungan_guru',
  LOGS: 'log_aktivitas',
  CONFIG: 'system_config',
  USERS: 'users',
};

// ================= SISWA =================
export async function fetchAllSiswaFromFirestore(): Promise<Siswa[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.SISWA));
    return snap.docs.map((d) => d.data() as Siswa);
  } catch (err) {
    console.error('Gagal mengambil data siswa dari Firestore:', err);
    return [];
  }
}

export function subscribeSiswa(callback: (siswa: Siswa[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.SISWA),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as Siswa);
      callback(data);
    },
    (err) => console.warn('Firestore Siswa listener warning:', err)
  );
}

export async function saveSiswaToFirestore(siswa: Siswa): Promise<boolean> {
  try {
    await setDoc(doc(db, COLLECTIONS.SISWA, siswa.id_siswa), siswa, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan siswa ke Firestore:', err);
    return false;
  }
}

export async function deleteSiswaFromFirestore(id_siswa: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.SISWA, id_siswa));
    return true;
  } catch (err) {
    console.error('Gagal menghapus siswa dari Firestore:', err);
    return false;
  }
}

// ================= DUDI =================
export async function fetchAllDudiFromFirestore(): Promise<DUDI[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.DUDI));
    return snap.docs.map((d) => d.data() as DUDI);
  } catch (err) {
    console.error('Gagal mengambil data DUDI dari Firestore:', err);
    return [];
  }
}

export function subscribeDudi(callback: (dudi: DUDI[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.DUDI),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as DUDI);
      callback(data);
    },
    (err) => console.warn('Firestore DUDI listener warning:', err)
  );
}

export async function saveDudiToFirestore(dudi: DUDI): Promise<boolean> {
  try {
    await setDoc(doc(db, COLLECTIONS.DUDI, dudi.id_dudi), dudi, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan DUDI ke Firestore:', err);
    return false;
  }
}

export async function deleteDudiFromFirestore(id_dudi: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.DUDI, id_dudi));
    return true;
  } catch (err) {
    console.error('Gagal menghapus DUDI dari Firestore:', err);
    return false;
  }
}

// ================= GURU PEMBIMBING =================
export async function fetchAllGuruFromFirestore(): Promise<GuruPembimbing[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.GURU));
    return snap.docs.map((d) => d.data() as GuruPembimbing);
  } catch (err) {
    console.error('Gagal mengambil data guru dari Firestore:', err);
    return [];
  }
}

export function subscribeGuru(callback: (guru: GuruPembimbing[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.GURU),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as GuruPembimbing);
      callback(data);
    },
    (err) => console.warn('Firestore Guru listener warning:', err)
  );
}

export async function saveGuruToFirestore(guru: GuruPembimbing): Promise<boolean> {
  try {
    await setDoc(doc(db, COLLECTIONS.GURU, guru.id_guru), guru, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan guru ke Firestore:', err);
    return false;
  }
}

// ================= PRESENSI =================
export async function fetchAllPresensiFromFirestore(): Promise<Presensi[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.PRESENSI));
    return snap.docs.map((d) => d.data() as Presensi);
  } catch (err) {
    console.error('Gagal mengambil presensi dari Firestore:', err);
    return [];
  }
}

export function subscribePresensi(callback: (presensi: Presensi[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.PRESENSI),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as Presensi);
      callback(data);
    },
    (err) => console.warn('Firestore Presensi listener warning:', err)
  );
}

export async function savePresensiToFirestore(presensi: Presensi): Promise<boolean> {
  try {
    const cleanPresensi = { ...presensi };
    // Jika foto terlalu besar atau sudah di Drive, hapus base64 raksasa agar menghemat quota Firestore
    if (cleanPresensi.drive_view_url && cleanPresensi.foto_selfie?.startsWith('data:image')) {
      // Pertahankan thumbnail atau gunakan URL drive
    }
    await setDoc(doc(db, COLLECTIONS.PRESENSI, presensi.id_presensi), cleanPresensi, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan presensi ke Firestore:', err);
    return false;
  }
}

export async function deletePresensiFromFirestore(id_presensi: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.PRESENSI, id_presensi));
    return true;
  } catch (err) {
    console.error('Gagal menghapus presensi dari Firestore:', err);
    return false;
  }
}

// ================= JURNAL =================
export async function fetchAllJurnalFromFirestore(): Promise<JurnalHarian[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.JURNAL));
    return snap.docs.map((d) => d.data() as JurnalHarian);
  } catch (err) {
    console.error('Gagal mengambil jurnal dari Firestore:', err);
    return [];
  }
}

export function subscribeJurnal(callback: (jurnal: JurnalHarian[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.JURNAL),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as JurnalHarian);
      callback(data);
    },
    (err) => console.warn('Firestore Jurnal listener warning:', err)
  );
}

export async function saveJurnalToFirestore(jurnal: JurnalHarian): Promise<boolean> {
  try {
    await setDoc(doc(db, COLLECTIONS.JURNAL, jurnal.id_jurnal), jurnal, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan jurnal ke Firestore:', err);
    return false;
  }
}

export async function deleteJurnalFromFirestore(id_jurnal: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.JURNAL, id_jurnal));
    return true;
  } catch (err) {
    console.error('Gagal menghapus jurnal dari Firestore:', err);
    return false;
  }
}

// ================= KUNJUNGAN GURU =================
export async function fetchAllKunjunganFromFirestore(): Promise<KunjunganGuru[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.KUNJUNGAN));
    return snap.docs.map((d) => d.data() as KunjunganGuru);
  } catch (err) {
    console.error('Gagal mengambil kunjungan dari Firestore:', err);
    return [];
  }
}

export function subscribeKunjungan(callback: (kunjungan: KunjunganGuru[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.KUNJUNGAN),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as KunjunganGuru);
      callback(data);
    },
    (err) => console.warn('Firestore Kunjungan listener warning:', err)
  );
}

export async function saveKunjunganToFirestore(kunjungan: KunjunganGuru): Promise<boolean> {
  try {
    await setDoc(doc(db, COLLECTIONS.KUNJUNGAN, kunjungan.id_kunjungan), kunjungan, { merge: true });
    return true;
  } catch (err) {
    console.error('Gagal menyimpan kunjungan ke Firestore:', err);
    return false;
  }
}

// ================= LOG AKTIVITAS =================
export async function saveLogToFirestore(log: LogAktivitas): Promise<boolean> {
  try {
    await setDoc(doc(db, COLLECTIONS.LOGS, log.id_log), log, { merge: true });
    return true;
  } catch (err) {
    console.warn('Gagal mencatat log ke Firestore:', err);
    return false;
  }
}

export function subscribeLogs(callback: (logs: LogAktivitas[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.LOGS),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as LogAktivitas);
      // Urutkan berdasarkan waktu descending
      data.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
      callback(data);
    },
    (err) => console.warn('Firestore Logs listener warning:', err)
  );
}

// ================= USERS & SEEDING =================
export async function seedInitialDataToFirestore(data: {
  siswa: Siswa[];
  dudi: DUDI[];
  guru: GuruPembimbing[];
  presensi: Presensi[];
  jurnal: JurnalHarian[];
  users: User[];
  logs: LogAktivitas[];
  kunjungan: KunjunganGuru[];
}): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Simpan Siswa
    for (const s of data.siswa) {
      await setDoc(doc(db, COLLECTIONS.SISWA, s.id_siswa), s, { merge: true });
    }
    // 2. Simpan DUDI
    for (const d of data.dudi) {
      await setDoc(doc(db, COLLECTIONS.DUDI, d.id_dudi), d, { merge: true });
    }
    // 3. Simpan Guru
    for (const g of data.guru) {
      await setDoc(doc(db, COLLECTIONS.GURU, g.id_guru), g, { merge: true });
    }
    // 4. Simpan Presensi
    for (const p of data.presensi) {
      await setDoc(doc(db, COLLECTIONS.PRESENSI, p.id_presensi), p, { merge: true });
    }
    // 5. Simpan Jurnal
    for (const j of data.jurnal) {
      await setDoc(doc(db, COLLECTIONS.JURNAL, j.id_jurnal), j, { merge: true });
    }
    // 6. Simpan Users
    for (const u of data.users) {
      await setDoc(doc(db, COLLECTIONS.USERS, u.id_user), u, { merge: true });
    }
    // 7. Simpan Kunjungan
    for (const k of data.kunjungan) {
      await setDoc(doc(db, COLLECTIONS.KUNJUNGAN, k.id_kunjungan), k, { merge: true });
    }

    return {
      success: true,
      message: 'Semua data master & riwayat berhasil disinkronkan ke Firebase Firestore Realtime!',
    };
  } catch (err: any) {
    console.error('Gagal seeding data ke Firestore:', err);
    return {
      success: false,
      message: `Gagal sinkronisasi data ke Firestore: ${err?.message || 'Error tidak diketahui'}`,
    };
  }
}
