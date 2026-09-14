/**
 * Layanan IndexedDB Client-Side untuk Penyimpanan Foto & Data Presensi Offline / Online
 * Bekerja tanpa batasan kuota 5MB localStorage (mendukung ratusan megabyte foto)
 */
import { Presensi, KunjunganGuru } from '../types';

const DB_NAME = 'PresensiPklIndexedDB';
const DB_VERSION = 1;
const STORE_PRESENSI = 'presensi_store';
const STORE_KUNJUNGAN = 'kunjungan_store';
const STORE_PHOTOS = 'photos_cache';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB tidak didukung pada lingkungan ini'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PRESENSI)) {
        db.createObjectStore(STORE_PRESENSI, { keyPath: 'id_presensi' });
      }
      if (!db.objectStoreNames.contains(STORE_KUNJUNGAN)) {
        db.createObjectStore(STORE_KUNJUNGAN, { keyPath: 'id_kunjungan' });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Gagal membuka IndexedDB'));
    };
  });
}

// ---------------- PRESENSI SISWA ----------------

export async function savePresensiToIndexedDb(presensi: Presensi): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PRESENSI, STORE_PHOTOS], 'readwrite');
      const presensiStore = tx.objectStore(STORE_PRESENSI);
      const photoStore = tx.objectStore(STORE_PHOTOS);

      presensiStore.put(presensi);

      if (presensi.foto_selfie && presensi.foto_selfie.startsWith('data:image')) {
        photoStore.put({
          id: presensi.id_presensi,
          dataUrl: presensi.foto_selfie,
          type: 'selfie_siswa',
          updatedAt: new Date().toISOString(),
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Gagal menyimpan presensi ke IndexedDB:', err);
  }
}

export async function getAllPresensiFromIndexedDb(): Promise<Presensi[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PRESENSI, 'readonly');
      const store = tx.objectStore(STORE_PRESENSI);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

// ---------------- KUNJUNGAN GURU ----------------

export async function saveKunjunganToIndexedDb(kunjungan: KunjunganGuru): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_KUNJUNGAN, STORE_PHOTOS], 'readwrite');
      const kunjunganStore = tx.objectStore(STORE_KUNJUNGAN);
      const photoStore = tx.objectStore(STORE_PHOTOS);

      kunjunganStore.put(kunjungan);

      if (kunjungan.foto_kunjungan && kunjungan.foto_kunjungan.startsWith('data:image')) {
        photoStore.put({
          id: kunjungan.id_kunjungan,
          dataUrl: kunjungan.foto_kunjungan,
          type: 'kunjungan_guru',
          updatedAt: new Date().toISOString(),
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Gagal menyimpan kunjungan guru ke IndexedDB:', err);
  }
}

export async function getAllKunjunganFromIndexedDb(): Promise<KunjunganGuru[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_KUNJUNGAN, 'readonly');
      const store = tx.objectStore(STORE_KUNJUNGAN);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

// ---------------- FOTO CACHE ----------------

export async function getCachedPhoto(id: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PHOTOS, 'readonly');
      const store = tx.objectStore(STORE_PHOTOS);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result?.dataUrl || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
