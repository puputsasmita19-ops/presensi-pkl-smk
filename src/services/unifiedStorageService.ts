import { Presensi } from '../types';
import { getCachedAccessToken } from './googleAuth';
import { uploadFileToDrive, getOrCreatePklFolder } from './googleDrive';
import { savePresensiToDb } from '../utils/apiService';
import { saveToOfflineQueue, removeFromOfflineQueue } from './offlinePresensiService';

export interface StorageExecutionReport {
  success: boolean;
  driveSuccess: boolean;
  driveUrl?: string;
  driveFileId?: string;
  driveMethod?: 'oauth' | 'none';
  databaseSuccess: boolean;
  databaseDestination: 'tidb_mysql' | 'offline_local';
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
 * Pipeline Penyimpanan Terpadu Presensi:
 * 1. Upload foto ke Google Drive jika terhubung (GAS Webhook / OAuth)
 * 2. Sematkan link Google Drive ke record data
 * 3. Simpan metadata presensi ke MySQL / TiDB Cloud (atau antrean offline jika koneksi offline/gagal)
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
    databaseSuccess: false,
    databaseDestination: 'offline_local',
    isOffline: !isDeviceOnline,
    errorMessages: [],
  };

  let workingPresensi: Presensi = { ...presensi };

  // LANGKAH 1: Unggah ke Google Drive (jika online & berkoneksi)
  if (isDeviceOnline) {
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

  // LANGKAH 2: Simpan ke Database MySQL / TiDB Cloud
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
        throw new Error('API server /api/presensi mengembalikan status gagal');
      }
    } catch (dbErr: any) {
      report.errorMessages.push(`Database MySQL/TiDB: ${dbErr?.message || 'Koneksi database terganggu'}`);
      // Fallback ke penyimpanan lokal aman
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

  // Sukses jika minimal data aman tersimpan (baik di MySQL/TiDB atau offline queue)
  report.success = true;
  return { presensi: workingPresensi, report };
}
