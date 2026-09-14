import { Presensi, KunjunganGuru } from '../types';
import { getCachedAccessToken } from './googleAuth';
import { uploadFileToDrive, getOrCreatePklFolder } from './googleDrive';
import { savePresensiToDb, saveKunjunganToDb, uploadPhotoToServer } from '../utils/apiService';
import { saveToOfflineQueue, removeFromOfflineQueue } from './offlinePresensiService';
import { savePresensiToIndexedDb, saveKunjunganToIndexedDb } from './indexedDbService';

export interface StorageExecutionReport {
  success: boolean;
  driveSuccess: boolean;
  driveUrl?: string;
  driveFileId?: string;
  driveMethod?: 'oauth' | 'server' | 'none';
  serverPhotoSaved: boolean;
  databaseSuccess: boolean;
  databaseDestination: 'tidb_mysql' | 'server_db' | 'offline_local';
  isOffline: boolean;
  errorMessages: string[];
}

/**
 * Mengunggah foto bukti presensi siswa ke Google Drive menggunakan OAuth Client ID
 */
export async function uploadPresensiPhotoToDrive(
  presensi: Presensi,
  studentName: string = 'Siswa'
): Promise<{ driveUrl?: string; driveFileId?: string; method: 'oauth' | 'none' }> {
  // Hanya proses jika ada foto selfie dan foto valid (data URI base64)
  if (!presensi.foto_selfie || !presensi.foto_selfie.startsWith('data:image')) {
    return { method: 'none' };
  }

  const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Presensi_${presensi.tanggal}_${cleanName}_${presensi.id_presensi}.jpg`;

  // Unggah ke Google Drive via OAuth Client ID
  const oauthToken = getCachedAccessToken();
  if (oauthToken) {
    try {
      const folderId = await getOrCreatePklFolder();
      // Konversi data URI ke blob untuk upload multipart
      const base64Data = presensi.foto_selfie.split(',')[1] || presensi.foto_selfie;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const uploaded = await uploadFileToDrive(fileName, blob, 'image/jpeg', folderId);
      return {
        driveUrl: uploaded.webViewLink,
        driveFileId: uploaded.id,
        method: 'oauth',
      };
    } catch (oauthErr: any) {
      console.warn('Gagal unggah ke Google Drive via OAuth:', oauthErr.message);
    }
  }

  return { method: 'none' };
}

/**
 * Pipeline Penyimpanan Terpadu Presensi Siswa:
 * 1. Simpan foto ke penyimpanan permanen server & Google Drive
 * 2. Simpan cache foto & presensi ke IndexedDB lokal (bebas limit 5MB)
 * 3. Simpan metadata presensi ke MySQL / Server Database
 */
export async function executeUnifiedPresensiSave(
  presensi: Presensi,
  studentName: string = 'Siswa'
): Promise<{ presensi: Presensi; report: StorageExecutionReport }> {
  const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const report: StorageExecutionReport = {
    success: false,
    driveSuccess: false,
    driveMethod: 'none',
    serverPhotoSaved: false,
    databaseSuccess: false,
    databaseDestination: 'offline_local',
    isOffline: !isDeviceOnline,
    errorMessages: [],
  };

  let workingPresensi: Presensi = { ...presensi };

  // LANGKAH 1: Simpan ke IndexedDB lokal segera (menghindari kehilangan data jika browser tertutup)
  try {
    await savePresensiToIndexedDb(workingPresensi);
  } catch (idbErr) {
    console.warn('Gagal menyimpan presensi ke IndexedDB:', idbErr);
  }

  // LANGKAH 2: Unggah foto ke Server Storage File & Google Drive
  if (isDeviceOnline && workingPresensi.foto_selfie?.startsWith('data:image')) {
    // A. Simpan ke Server File Storage (/api/uploads)
    try {
      const serverPhotoRes = await uploadPhotoToServer(
        workingPresensi.foto_selfie,
        workingPresensi.id_presensi,
        'selfie'
      );
      if (serverPhotoRes.success && serverPhotoRes.url) {
        report.serverPhotoSaved = true;
        if (!workingPresensi.drive_view_url) {
          workingPresensi.drive_view_url = serverPhotoRes.url;
        }
      }
    } catch (err: any) {
      console.warn('Gagal simpan foto ke server storage:', err?.message);
    }

    // B. Unggah ke Google Drive jika akun Google terhubung
    try {
      const driveRes = await uploadPresensiPhotoToDrive(workingPresensi, studentName);
      if (driveRes.driveUrl || driveRes.driveFileId) {
        report.driveSuccess = true;
        report.driveUrl = driveRes.driveUrl;
        report.driveFileId = driveRes.driveFileId;
        report.driveMethod = driveRes.method;

        workingPresensi = {
          ...workingPresensi,
          drive_file_id: driveRes.driveFileId,
          drive_view_url: driveRes.driveUrl,
        };
      }
    } catch (err: any) {
      report.errorMessages.push(`Google Drive: ${err?.message || 'Gagal unggah foto'}`);
    }
  }

  // LANGKAH 3: Simpan ke Database Backend (MySQL atau Server Local DB)
  if (isDeviceOnline) {
    try {
      const cleanPayload: Presensi = {
        ...workingPresensi,
        hari: workingPresensi.hari || '',
        jam_masuk: workingPresensi.jam_masuk || '',
        jam_pulang: workingPresensi.jam_pulang || null,
        foto_selfie: workingPresensi.foto_selfie || '',
        koordinat_absen: workingPresensi.koordinat_absen || { latitude: 0, longitude: 0, jarak_meter: 0, dalam_radius: true },
        id_shift: workingPresensi.id_shift || undefined,
        nama_shift: workingPresensi.nama_shift || undefined,
        jadwal_masuk: workingPresensi.jadwal_masuk || undefined,
        jadwal_pulang: workingPresensi.jadwal_pulang || undefined,
        status_ketepatan: workingPresensi.status_ketepatan || undefined,
        keterangan: workingPresensi.keterangan || undefined,
        notifikasi_wa_terkirim: !!workingPresensi.notifikasi_wa_terkirim,
        is_offline_pending: false,
        synced_to_db: true,
        synced_to_firebase: true,
        synced_at: new Date().toISOString(),
      };

      const dbSuccess = await savePresensiToDb(cleanPayload);
      if (dbSuccess) {
        report.databaseSuccess = true;
        report.databaseDestination = 'tidb_mysql';
        workingPresensi = {
          ...cleanPayload,
          is_offline_pending: false,
          synced_to_db: true,
          synced_to_firebase: true,
          synced_at: cleanPayload.synced_at,
        };
        // Hapus dari offline queue jika sebelumnya ada
        removeFromOfflineQueue(workingPresensi.id_presensi);
      } else {
        throw new Error('Gagal menyimpan presensi ke backend API.');
      }
    } catch (dbErr: any) {
      report.errorMessages.push(`Database: ${dbErr?.message || 'Koneksi database terganggu'}`);
      // Fallback ke offline queue
      const fallbackPresensi: Presensi = {
        ...workingPresensi,
        is_offline_pending: true,
        synced_to_db: false,
        synced_to_firebase: false,
      };
      saveToOfflineQueue(fallbackPresensi);
      workingPresensi = fallbackPresensi;
      report.databaseDestination = 'offline_local';
    }
  } else {
    // Mode Offline
    const offlinePresensi: Presensi = {
      ...workingPresensi,
      is_offline_pending: true,
      synced_to_db: false,
      synced_to_firebase: false,
    };
    saveToOfflineQueue(offlinePresensi);
    workingPresensi = offlinePresensi;
    report.databaseDestination = 'offline_local';
  }

  // Update ulang ke IndexedDB dengan URL foto terbaru
  try {
    await savePresensiToIndexedDb(workingPresensi);
  } catch {}

  report.success = true;
  return { presensi: workingPresensi, report };
}

/**
 * Mengunggah foto bukti kunjungan/supervisi guru ke Google Drive menggunakan OAuth Client ID
 */
export async function uploadKunjunganPhotoToDrive(
  kunjungan: KunjunganGuru
): Promise<{ driveUrl?: string; driveFileId?: string; method: 'oauth' | 'none' }> {
  // Hanya proses jika ada foto dan valid (data URI base64)
  if (!kunjungan.foto_kunjungan || !kunjungan.foto_kunjungan.startsWith('data:image')) {
    return { method: 'none' };
  }

  const cleanTeacherName = (kunjungan.nama_guru || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanDudi = (kunjungan.nama_dudi || 'DUDI').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `KunjunganGuru_${kunjungan.tanggal}_${cleanTeacherName}_${cleanDudi}_${kunjungan.id_kunjungan}.jpg`;

  // Unggah ke Google Drive via OAuth Client ID
  const oauthToken = getCachedAccessToken();
  if (oauthToken) {
    try {
      const folderId = await getOrCreatePklFolder();
      const base64Data = kunjungan.foto_kunjungan.split(',')[1] || kunjungan.foto_kunjungan;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const uploaded = await uploadFileToDrive(fileName, blob, 'image/jpeg', folderId);
      return {
        driveUrl: uploaded.webViewLink,
        driveFileId: uploaded.id,
        method: 'oauth',
      };
    } catch (oauthErr: any) {
      console.warn('Gagal unggah foto kunjungan guru ke Google Drive via OAuth:', oauthErr.message);
    }
  }

  return { method: 'none' };
}

/**
 * Pipeline Penyimpanan Terpadu Presensi Kunjungan Guru:
 * 1. Simpan foto bukti supervisi ke server storage & Google Drive
 * 2. Simpan cache foto & kunjungan ke IndexedDB lokal
 * 3. Simpan data kunjungan ke MySQL / Server Database
 */
export async function executeUnifiedKunjunganSave(
  kunjungan: KunjunganGuru
): Promise<{ kunjungan: KunjunganGuru; report: StorageExecutionReport }> {
  const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const report: StorageExecutionReport = {
    success: false,
    driveSuccess: false,
    driveMethod: 'none',
    serverPhotoSaved: false,
    databaseSuccess: false,
    databaseDestination: 'offline_local',
    isOffline: !isDeviceOnline,
    errorMessages: [],
  };

  let workingKunjungan: KunjunganGuru = { ...kunjungan };

  // LANGKAH 1: Simpan ke IndexedDB lokal segera
  try {
    await saveKunjunganToIndexedDb(workingKunjungan);
  } catch (idbErr) {
    console.warn('Gagal menyimpan kunjungan ke IndexedDB:', idbErr);
  }

  // LANGKAH 2: Unggah foto ke Server Storage File & Google Drive
  if (isDeviceOnline && workingKunjungan.foto_kunjungan?.startsWith('data:image')) {
    // A. Simpan ke Server File Storage (/api/uploads)
    try {
      const serverPhotoRes = await uploadPhotoToServer(
        workingKunjungan.foto_kunjungan,
        workingKunjungan.id_kunjungan,
        'kunjungan'
      );
      if (serverPhotoRes.success && serverPhotoRes.url) {
        report.serverPhotoSaved = true;
        if (!workingKunjungan.drive_view_url) {
          workingKunjungan.drive_view_url = serverPhotoRes.url;
        }
      }
    } catch (err: any) {
      console.warn('Gagal simpan foto kunjungan ke server storage:', err?.message);
    }

    // B. Unggah ke Google Drive jika akun Google terhubung
    try {
      const driveRes = await uploadKunjunganPhotoToDrive(workingKunjungan);
      if (driveRes.driveUrl || driveRes.driveFileId) {
        report.driveSuccess = true;
        report.driveUrl = driveRes.driveUrl;
        report.driveFileId = driveRes.driveFileId;
        report.driveMethod = driveRes.method;

        workingKunjungan = {
          ...workingKunjungan,
          drive_file_id: driveRes.driveFileId,
          drive_view_url: driveRes.driveUrl,
        };
      }
    } catch (err: any) {
      report.errorMessages.push(`Google Drive (Foto Guru): ${err?.message || 'Gagal unggah foto'}`);
    }
  }

  // LANGKAH 3: Simpan ke Database Backend (MySQL atau Server Local DB)
  if (isDeviceOnline) {
    try {
      const dbSuccess = await saveKunjunganToDb(workingKunjungan);
      if (dbSuccess) {
        report.databaseSuccess = true;
        report.databaseDestination = 'tidb_mysql';
        workingKunjungan = {
          ...workingKunjungan,
          synced_to_db: true,
        };
      }
    } catch (dbErr: any) {
      report.errorMessages.push(`Database: ${dbErr?.message || 'Koneksi database terganggu'}`);
    }
  }

  // Update ulang ke IndexedDB dengan URL foto terbaru
  try {
    await saveKunjunganToIndexedDb(workingKunjungan);
  } catch {}

  report.success = true;
  return { kunjungan: workingKunjungan, report };
}

