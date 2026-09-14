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
  imageSyncStatus: 'synced' | 'pending-image-sync' | 'not-applicable';
  errorMessages: string[];
}

export interface DriveUploadResult {
  success: boolean;
  driveUrl?: string;
  driveFileId?: string;
  method: 'oauth' | 'none';
  error?: string;
}

export interface DatabaseSubmissionResult<T> {
  success: boolean;
  data: T;
  destination: 'tidb_mysql' | 'server_db' | 'offline_local';
  error?: string;
}

// ============================================================================
// MODUL 1: LOGIKA KONVERSI GAMBAR KE BLOB GOOGLE DRIVE (Image-to-Drive Blob)
// ============================================================================

/**
 * Mengonversi Base64 Data URI ke W3C Blob standar untuk upload file multipart ke Google Drive.
 * Logika ini terisolasi sepenuhnya dari transmisi data teks / database.
 */
export function convertDataUriToBlob(
  dataUri: string,
  defaultMimeType: string = 'image/jpeg'
): { blob: Blob; mimeType: string } {
  try {
    let mimeType = defaultMimeType;
    let base64Data = dataUri;

    if (dataUri.includes(';base64,')) {
      const parts = dataUri.split(';base64,');
      mimeType = parts[0].replace('data:', '') || defaultMimeType;
      base64Data = parts[1];
    } else if (dataUri.startsWith('data:')) {
      const commaIdx = dataUri.indexOf(',');
      if (commaIdx !== -1) {
        mimeType = dataUri.substring(5, commaIdx).split(';')[0] || defaultMimeType;
        base64Data = dataUri.substring(commaIdx + 1);
      }
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    return { blob, mimeType };
  } catch (err: any) {
    throw new Error(`Gagal konversi Base64 ke Blob gambar: ${err?.message || 'Format tidak valid'}`);
  }
}

/**
 * Menyiapkan payload Blob dan nama file untuk presensi selfie siswa.
 */
export function createPresensiDriveUploadPayload(
  presensi: Presensi,
  studentName: string = 'Siswa'
): { fileName: string; blob: Blob; mimeType: string } | null {
  if (!presensi.foto_selfie || !presensi.foto_selfie.startsWith('data:image')) {
    return null;
  }

  const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Presensi_${presensi.tanggal}_${cleanName}_${presensi.id_presensi}.jpg`;
  const { blob, mimeType } = convertDataUriToBlob(presensi.foto_selfie, 'image/jpeg');

  return { fileName, blob, mimeType };
}

/**
 * Menyiapkan payload Blob dan nama file untuk foto supervisi kunjungan guru.
 */
export function createKunjunganDriveUploadPayload(
  kunjungan: KunjunganGuru
): { fileName: string; blob: Blob; mimeType: string } | null {
  if (!kunjungan.foto_kunjungan || !kunjungan.foto_kunjungan.startsWith('data:image')) {
    return null;
  }

  const cleanTeacherName = (kunjungan.nama_guru || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanDudi = (kunjungan.nama_dudi || 'DUDI').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `KunjunganGuru_${kunjungan.tanggal}_${cleanTeacherName}_${cleanDudi}_${kunjungan.id_kunjungan}.jpg`;
  const { blob, mimeType } = convertDataUriToBlob(kunjungan.foto_kunjungan, 'image/jpeg');

  return { fileName, blob, mimeType };
}

/**
 * Mengunggah Blob foto presensi siswa ke Google Drive via OAuth Client ID
 */
export async function uploadPresensiPhotoToDrive(
  presensi: Presensi,
  studentName: string = 'Siswa'
): Promise<DriveUploadResult> {
  const payload = createPresensiDriveUploadPayload(presensi, studentName);
  if (!payload) {
    return { success: false, method: 'none' };
  }

  const oauthToken = getCachedAccessToken();
  if (!oauthToken) {
    return {
      success: false,
      method: 'none',
      error: 'Akun Google Drive belum terautentikasi (OAuth token tidak tersedia).',
    };
  }

  try {
    const folderId = await getOrCreatePklFolder();
    const uploaded = await uploadFileToDrive(
      payload.fileName,
      payload.blob,
      payload.mimeType,
      folderId
    );

    return {
      success: true,
      driveUrl: uploaded.webViewLink,
      driveFileId: uploaded.id,
      method: 'oauth',
    };
  } catch (oauthErr: any) {
    console.warn('Gagal unggah foto presensi ke Google Drive via OAuth:', oauthErr.message);
    return {
      success: false,
      method: 'oauth',
      error: oauthErr?.message || 'Gagal mengunggah berkas ke Google Drive API',
    };
  }
}

/**
 * Mengunggah Blob foto kunjungan supervisi guru ke Google Drive via OAuth Client ID
 */
export async function uploadKunjunganPhotoToDrive(
  kunjungan: KunjunganGuru
): Promise<DriveUploadResult> {
  const payload = createKunjunganDriveUploadPayload(kunjungan);
  if (!payload) {
    return { success: false, method: 'none' };
  }

  const oauthToken = getCachedAccessToken();
  if (!oauthToken) {
    return {
      success: false,
      method: 'none',
      error: 'Akun Google Drive belum terautentikasi (OAuth token tidak tersedia).',
    };
  }

  try {
    const folderId = await getOrCreatePklFolder();
    const uploaded = await uploadFileToDrive(
      payload.fileName,
      payload.blob,
      payload.mimeType,
      folderId
    );

    return {
      success: true,
      driveUrl: uploaded.webViewLink,
      driveFileId: uploaded.id,
      method: 'oauth',
    };
  } catch (oauthErr: any) {
    console.warn('Gagal unggah foto kunjungan ke Google Drive via OAuth:', oauthErr.message);
    return {
      success: false,
      method: 'oauth',
      error: oauthErr?.message || 'Gagal mengunggah berkas kunjungan ke Google Drive API',
    };
  }
}

// ============================================================================
// MODUL 2: LOGIKA SUBMISI TEKS KE DATABASE (Text-to-Database Submission)
// ============================================================================

/**
 * Mengirim data teks & metadata presensi siswa ke Database backend.
 * Jika Drive gagal, data teks tetap disimpan dengan status image_sync_status: 'pending-image-sync'.
 */
export async function submitPresensiToDatabase(
  presensi: Presensi,
  imageSyncStatus: 'synced' | 'pending-image-sync' | 'not-applicable',
  isOnline: boolean = true
): Promise<DatabaseSubmissionResult<Presensi>> {
  const cleanPayload: Presensi = {
    ...presensi,
    hari: presensi.hari || '',
    jam_masuk: presensi.jam_masuk || '',
    jam_pulang: presensi.jam_pulang || null,
    foto_selfie: presensi.foto_selfie || '',
    drive_file_id: presensi.drive_file_id || undefined,
    drive_view_url: presensi.drive_view_url || undefined,
    image_sync_status: imageSyncStatus,
    koordinat_absen: presensi.koordinat_absen || {
      latitude: 0,
      longitude: 0,
      jarak_meter: 0,
      dalam_radius: true,
    },
    id_shift: presensi.id_shift || undefined,
    nama_shift: presensi.nama_shift || undefined,
    jadwal_masuk: presensi.jadwal_masuk || undefined,
    jadwal_pulang: presensi.jadwal_pulang || undefined,
    status_ketepatan: presensi.status_ketepatan || undefined,
    keterangan: presensi.keterangan || undefined,
    notifikasi_wa_terkirim: !!presensi.notifikasi_wa_terkirim,
  };

  if (isOnline) {
    try {
      const payloadToSend: Presensi = {
        ...cleanPayload,
        is_offline_pending: false,
        synced_to_db: true,
        synced_to_firebase: true,
        synced_at: new Date().toISOString(),
      };

      const dbSuccess = await savePresensiToDb(payloadToSend);
      if (dbSuccess) {
        // Hapus dari offline queue jika sebelumnya ada
        removeFromOfflineQueue(cleanPayload.id_presensi);
        return {
          success: true,
          data: payloadToSend,
          destination: 'tidb_mysql',
        };
      } else {
        throw new Error('Endpoint database API /api/presensi mengembalikan status gagal');
      }
    } catch (dbErr: any) {
      const errorMsg = dbErr?.message || 'Koneksi database online terganggu';
      // Fallback ke penyimpanan antrean offline
      const fallbackPresensi: Presensi = {
        ...cleanPayload,
        is_offline_pending: true,
        synced_to_db: false,
        synced_to_firebase: false,
      };
      saveToOfflineQueue(fallbackPresensi);
      return {
        success: false,
        data: fallbackPresensi,
        destination: 'offline_local',
        error: errorMsg,
      };
    }
  } else {
    // Mode Offline
    const offlinePresensi: Presensi = {
      ...cleanPayload,
      is_offline_pending: true,
      synced_to_db: false,
      synced_to_firebase: false,
    };
    saveToOfflineQueue(offlinePresensi);
    return {
      success: true,
      data: offlinePresensi,
      destination: 'offline_local',
    };
  }
}

/**
 * Mengirim data teks & metadata kunjungan guru ke Database backend.
 */
export async function submitKunjunganToDatabase(
  kunjungan: KunjunganGuru,
  imageSyncStatus: 'synced' | 'pending-image-sync' | 'not-applicable',
  isOnline: boolean = true
): Promise<DatabaseSubmissionResult<KunjunganGuru>> {
  const cleanPayload: KunjunganGuru = {
    ...kunjungan,
    image_sync_status: imageSyncStatus,
    drive_file_id: kunjungan.drive_file_id || undefined,
    drive_view_url: kunjungan.drive_view_url || undefined,
  };

  if (isOnline) {
    try {
      const payloadToSend: KunjunganGuru = {
        ...cleanPayload,
        synced_to_db: true,
      };
      const dbSuccess = await saveKunjunganToDb(payloadToSend);
      if (dbSuccess) {
        return {
          success: true,
          data: payloadToSend,
          destination: 'tidb_mysql',
        };
      } else {
        throw new Error('Endpoint database API /api/kunjungan mengembalikan status gagal');
      }
    } catch (dbErr: any) {
      return {
        success: false,
        data: cleanPayload,
        destination: 'offline_local',
        error: dbErr?.message || 'Koneksi database terganggu',
      };
    }
  }

  return {
    success: true,
    data: cleanPayload,
    destination: 'offline_local',
  };
}

// ============================================================================
// MODUL 3: PIPELINE PENYIMPANAN TERPADU (Unified Storage Pipeline Coordinator)
// ============================================================================

/**
 * Pipeline Penyimpanan Terpadu Presensi Siswa:
 * 1. Simpan segera ke IndexedDB lokal untuk persistensi instan.
 * 2. Simpan foto ke Server Local Storage (/api/upload-photo).
 * 3. Konversi dan unggah Blob foto ke Google Drive (jika akun Google terhubung).
 *    - Jika Google Drive gagal atau belum login, tandai imageSyncStatus = 'pending-image-sync'.
 *    - Jika Google Drive sukses, tandai imageSyncStatus = 'synced'.
 * 4. Submisi data teks ke Database (MySQL / Server DB):
 *    - Tetap dibuat dan disimpan di Database sekalipun Drive gagal, dengan status 'pending-image-sync'.
 * 5. Perbarui cache IndexedDB dengan rekaman terbaru.
 */
export async function executeUnifiedPresensiSave(
  presensi: Presensi,
  studentName: string = 'Siswa'
): Promise<{ presensi: Presensi; report: StorageExecutionReport }> {
  const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const hasSelfieImage = Boolean(presensi.foto_selfie && presensi.foto_selfie.startsWith('data:image'));

  let imageSyncStatus: 'synced' | 'pending-image-sync' | 'not-applicable' = hasSelfieImage
    ? 'pending-image-sync'
    : 'not-applicable';

  const report: StorageExecutionReport = {
    success: false,
    driveSuccess: false,
    driveMethod: 'none',
    serverPhotoSaved: false,
    databaseSuccess: false,
    databaseDestination: 'offline_local',
    isOffline: !isDeviceOnline,
    imageSyncStatus: imageSyncStatus,
    errorMessages: [],
  };

  let workingPresensi: Presensi = {
    ...presensi,
    image_sync_status: imageSyncStatus,
  };

  // LANGKAH 1: Simpan ke IndexedDB lokal segera (mencegah kehilangan data jika browser tertutup)
  try {
    await savePresensiToIndexedDb(workingPresensi);
  } catch (idbErr) {
    console.warn('Gagal menyimpan presensi ke IndexedDB lokal:', idbErr);
  }

  // LANGKAH 2: Upload foto ke Server Storage File & Google Drive
  if (isDeviceOnline && hasSelfieImage) {
    // A. Simpan ke Server File Storage (/api/upload-photo)
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

    // B. Unggah Blob Foto ke Google Drive via OAuth
    try {
      const driveRes = await uploadPresensiPhotoToDrive(workingPresensi, studentName);
      if (driveRes.success && (driveRes.driveUrl || driveRes.driveFileId)) {
        report.driveSuccess = true;
        report.driveUrl = driveRes.driveUrl;
        report.driveFileId = driveRes.driveFileId;
        report.driveMethod = driveRes.method;
        imageSyncStatus = 'synced';

        workingPresensi = {
          ...workingPresensi,
          drive_file_id: driveRes.driveFileId,
          drive_view_url: driveRes.driveUrl || workingPresensi.drive_view_url,
          image_sync_status: 'synced',
        };
      } else {
        // Drive gagal -> Tandai status sinkronisasi foto sebagai pending-image-sync
        imageSyncStatus = 'pending-image-sync';
        workingPresensi.image_sync_status = 'pending-image-sync';
        if (driveRes.error) {
          report.errorMessages.push(`Google Drive: ${driveRes.error}`);
        }
      }
    } catch (err: any) {
      imageSyncStatus = 'pending-image-sync';
      workingPresensi.image_sync_status = 'pending-image-sync';
      report.errorMessages.push(`Google Drive: ${err?.message || 'Gagal memproses Blob/unggahan foto'}`);
    }
  }

  report.imageSyncStatus = imageSyncStatus;

  // LANGKAH 3: Submisi Teks ke Database (MySQL / Server Local DB)
  // CATATAN: Langkah ini selalu dieksekusi terlepas dari apakah Drive sukses atau gagal
  const dbResult = await submitPresensiToDatabase(workingPresensi, imageSyncStatus, isDeviceOnline);
  workingPresensi = dbResult.data;
  report.databaseSuccess = dbResult.success;
  report.databaseDestination = dbResult.destination;
  if (dbResult.error) {
    report.errorMessages.push(`Database: ${dbResult.error}`);
  }

  // LANGKAH 4: Perbarui rekaman lengkap ke IndexedDB
  try {
    await savePresensiToIndexedDb(workingPresensi);
  } catch (idbErr) {
    console.warn('Gagal memperbarui IndexedDB:', idbErr);
  }

  report.success = true;
  return { presensi: workingPresensi, report };
}

/**
 * Pipeline Penyimpanan Terpadu Presensi Kunjungan Guru:
 * 1. Simpan segera ke IndexedDB lokal.
 * 2. Simpan foto ke Server Local Storage (/api/upload-photo).
 * 3. Konversi dan unggah Blob foto ke Google Drive (jika akun Google terhubung).
 *    - Jika Google Drive gagal, tandai imageSyncStatus = 'pending-image-sync'.
 *    - Jika Google Drive sukses, tandai imageSyncStatus = 'synced'.
 * 4. Submisi data teks ke Database (tetap tersimpan sekalipun Drive gagal).
 * 5. Perbarui cache IndexedDB lokal.
 */
export async function executeUnifiedKunjunganSave(
  kunjungan: KunjunganGuru
): Promise<{ kunjungan: KunjunganGuru; report: StorageExecutionReport }> {
  const isDeviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const hasPhoto = Boolean(kunjungan.foto_kunjungan && kunjungan.foto_kunjungan.startsWith('data:image'));

  let imageSyncStatus: 'synced' | 'pending-image-sync' | 'not-applicable' = hasPhoto
    ? 'pending-image-sync'
    : 'not-applicable';

  const report: StorageExecutionReport = {
    success: false,
    driveSuccess: false,
    driveMethod: 'none',
    serverPhotoSaved: false,
    databaseSuccess: false,
    databaseDestination: 'offline_local',
    isOffline: !isDeviceOnline,
    imageSyncStatus: imageSyncStatus,
    errorMessages: [],
  };

  let workingKunjungan: KunjunganGuru = {
    ...kunjungan,
    image_sync_status: imageSyncStatus,
  };

  // LANGKAH 1: Simpan ke IndexedDB lokal segera
  try {
    await saveKunjunganToIndexedDb(workingKunjungan);
  } catch (idbErr) {
    console.warn('Gagal menyimpan kunjungan ke IndexedDB:', idbErr);
  }

  // LANGKAH 2: Simpan Foto ke Server & Google Drive
  if (isDeviceOnline && hasPhoto) {
    // A. Simpan ke Server File Storage (/api/upload-photo)
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

    // B. Unggah Blob Foto ke Google Drive via OAuth
    try {
      const driveRes = await uploadKunjunganPhotoToDrive(workingKunjungan);
      if (driveRes.success && (driveRes.driveUrl || driveRes.driveFileId)) {
        report.driveSuccess = true;
        report.driveUrl = driveRes.driveUrl;
        report.driveFileId = driveRes.driveFileId;
        report.driveMethod = driveRes.method;
        imageSyncStatus = 'synced';

        workingKunjungan = {
          ...workingKunjungan,
          drive_file_id: driveRes.driveFileId,
          drive_view_url: driveRes.driveUrl || workingKunjungan.drive_view_url,
          image_sync_status: 'synced',
        };
      } else {
        imageSyncStatus = 'pending-image-sync';
        workingKunjungan.image_sync_status = 'pending-image-sync';
        if (driveRes.error) {
          report.errorMessages.push(`Google Drive: ${driveRes.error}`);
        }
      }
    } catch (err: any) {
      imageSyncStatus = 'pending-image-sync';
      workingKunjungan.image_sync_status = 'pending-image-sync';
      report.errorMessages.push(`Google Drive: ${err?.message || 'Gagal memproses unggahan foto guru'}`);
    }
  }

  report.imageSyncStatus = imageSyncStatus;

  // LANGKAH 3: Submisi Teks ke Database Backend
  const dbResult = await submitKunjunganToDatabase(workingKunjungan, imageSyncStatus, isDeviceOnline);
  workingKunjungan = dbResult.data;
  report.databaseSuccess = dbResult.success;
  report.databaseDestination = dbResult.destination;
  if (dbResult.error) {
    report.errorMessages.push(`Database: ${dbResult.error}`);
  }

  // LANGKAH 4: Perbarui IndexedDB lokal
  try {
    await saveKunjunganToIndexedDb(workingKunjungan);
  } catch (idbErr) {
    console.warn('Gagal memperbarui IndexedDB:', idbErr);
  }

  report.success = true;
  return { kunjungan: workingKunjungan, report };
}
