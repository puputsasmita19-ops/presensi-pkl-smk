/**
 * Service untuk mengelola antrean presensi saat offline
 * dan melakukan sinkronisasi otomatis ke Firebase Firestore saat online
 */
import { Presensi } from '../types';
import { savePresensiToFirestore as saveToFirestoreDoc } from './firestoreService';

export const OFFLINE_QUEUE_KEY = 'pkl_offline_presensi_queue';

/**
 * Membaca antrean data presensi offline yang tersimpan di localStorage
 */
export const getOfflineQueue = (): Presensi[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Gagal membaca antrean presensi offline dari localStorage:', err);
    return [];
  }
};

/**
 * Menyimpan data presensi sementara ke localStorage saat tidak ada koneksi
 */
export const saveToOfflineQueue = (presensi: Presensi): Presensi[] => {
  try {
    const currentQueue = getOfflineQueue();
    const existingIndex = currentQueue.findIndex((p) => p.id_presensi === presensi.id_presensi);

    const markedPresensi: Presensi = {
      ...presensi,
      is_offline_pending: true,
      synced_to_db: false,
      synced_to_firebase: false,
    };

    let updatedQueue: Presensi[];
    if (existingIndex >= 0) {
      updatedQueue = [...currentQueue];
      updatedQueue[existingIndex] = markedPresensi;
    } else {
      updatedQueue = [markedPresensi, ...currentQueue];
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
    return updatedQueue;
  } catch (err) {
    console.error('Gagal menyimpan ke antrean offline localStorage:', err);
    return getOfflineQueue();
  }
};

/**
 * Menghapus data presensi dari antrean offline setelah berhasil terkirim ke Firestore
 */
export const removeFromOfflineQueue = (id_presensi: string): Presensi[] => {
  try {
    const currentQueue = getOfflineQueue();
    const updated = currentQueue.filter((p) => p.id_presensi !== id_presensi);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Gagal menghapus item dari antrean offline:', err);
    return getOfflineQueue();
  }
};

/**
 * Mengirim satu record presensi langsung ke Firebase Firestore
 */
export const savePresensiToDatabase = async (presensi: Presensi): Promise<void> => {
  const cleanPayload: Presensi = {
    ...presensi,
    hari: presensi.hari || '',
    jam_masuk: presensi.jam_masuk || '',
    jam_pulang: presensi.jam_pulang || null,
    foto_selfie: presensi.foto_selfie || '',
    koordinat_absen: presensi.koordinat_absen || { latitude: 0, longitude: 0, jarak_meter: 0, dalam_radius: true },
    id_shift: presensi.id_shift || undefined,
    nama_shift: presensi.nama_shift || undefined,
    jadwal_masuk: presensi.jadwal_masuk || undefined,
    jadwal_pulang: presensi.jadwal_pulang || undefined,
    status_ketepatan: presensi.status_ketepatan || undefined,
    keterangan: presensi.keterangan || undefined,
    notifikasi_wa_terkirim: !!presensi.notifikasi_wa_terkirim,
    is_offline_pending: false,
    synced_to_db: true,
    synced_to_firebase: true,
    synced_at: new Date().toISOString(),
  };

  const success = await saveToFirestoreDoc(cleanPayload);
  if (!success) {
    throw new Error('Gagal menyimpan ke Firebase Firestore.');
  }
};

/**
 * Melakukan sinkronisasi otomatis seluruh antrean offline ke Firebase Firestore
 * ketika koneksi internet kembali online / stabil
 */
export const syncOfflinePresensiToDatabase = async (
  onItemSynced?: (presensi: Presensi) => void
): Promise<{
  successCount: number;
  failedCount: number;
  syncedRecords: Presensi[];
  errors: string[];
}> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { successCount: 0, failedCount: 0, syncedRecords: [], errors: [] };
  }

  let successCount = 0;
  let failedCount = 0;
  const syncedRecords: Presensi[] = [];
  const errors: string[] = [];

  for (const item of queue) {
    try {
      await savePresensiToDatabase(item);
      removeFromOfflineQueue(item.id_presensi);
      const syncedItem: Presensi = {
        ...item,
        is_offline_pending: false,
        synced_to_db: true,
        synced_to_firebase: true,
        synced_at: new Date().toISOString(),
      };
      syncedRecords.push(syncedItem);
      onItemSynced?.(syncedItem);
      successCount++;
    } catch (err: any) {
      console.error(`Gagal menyinkronkan presensi ${item.id_presensi} ke Firestore:`, err);
      failedCount++;
      errors.push(err?.message || 'Gagal mengirim ke Firestore database');
    }
  }

  return { successCount, failedCount, syncedRecords, errors };
};

export const savePresensiToFirestore = savePresensiToDatabase;
export const syncOfflinePresensiToFirebase = syncOfflinePresensiToDatabase;
