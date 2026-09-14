import { Presensi, KunjunganGuru } from '../types';
import { getCachedAccessToken } from './googleAuth';
import { uploadFileToDrive, getOrCreatePklFolder } from './googleDrive';
import { saveToOfflineQueue } from './offlinePresensiService';
import { savePresensiToIndexedDb, saveKunjunganToIndexedDb } from './indexedDbService';
import { savePresensiToFirestore, saveKunjunganToFirestore } from './firestoreService';

export interface StorageExecutionReport {
  success: boolean;
  driveSuccess: boolean;
  driveUrl?: string;
  driveFileId?: string;
  driveMethod?: 'oauth' | 'none';
  serverPhotoSaved: boolean;
  databaseSuccess: boolean;
  databaseDestination: 'firestore' | 'offline_local';
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

/**
 * Mengonversi Base64 Data URI ke W3C Blob standar untuk upload file multipart ke Google Drive.
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

    const cleanBase64 = base64Data.replace(/[\r\n\s]+/g, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return { blob, mimeType };
  } catch (err: any) {
    console.error('Error saat konversi Base64 ke Blob:', err);
    const fallbackBlob = new Blob([dataUri], { type: 'text/plain' });
    return { blob: fallbackBlob, mimeType: 'text/plain' };
  }
}

export function createPresensiDriveUploadPayload(
  presensi: Presensi,
  studentName: string = 'Siswa'
): { blob: Blob; fileName: string; mimeType: string } | null {
  if (!presensi.foto_selfie || !presensi.foto_selfie.startsWith('data:image')) {
    return null;
  }

  const { blob, mimeType } = convertDataUriToBlob(presensi.foto_selfie);
  const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = presensi.tanggal.replace(/-/g, '');
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `SELFIE_${dateStr}_${cleanName}_${presensi.id_presensi}.${ext}`;

  return { blob, fileName, mimeType };
}

export function createKunjunganDriveUploadPayload(
  kunjungan: KunjunganGuru,
  guruName: string = 'Guru'
): { blob: Blob; fileName: string; mimeType: string } | null {
  if (!kunjungan.foto_kunjungan || !kunjungan.foto_kunjungan.startsWith('data:image')) {
    return null;
  }

  const { blob, mimeType } = convertDataUriToBlob(kunjungan.foto_kunjungan);
  const cleanGuru = (guruName || kunjungan.nama_guru || 'Guru').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDudi = (kunjungan.nama_dudi || 'DUDI').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = (kunjungan.tanggal || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `KUNJUNGAN_${dateStr}_${cleanGuru}_${cleanDudi}.${ext}`;

  return { blob, fileName, mimeType };
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
      error: 'Akun Google Drive belum terautentikasi.',
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
    console.warn('Gagal unggah foto presensi ke Google Drive via OAuth:', oauthErr?.message);
    return {
      success: false,
      method: 'oauth',
      error: oauthErr?.message || 'Gagal mengunggah berkas ke Google Drive API',
    };
  }
}

/**
 * Mengunggah Blob foto kunjungan guru ke Google Drive via OAuth Client ID
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
      error: 'Akun Google Drive belum terautentikasi.',
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
    console.warn('Gagal unggah foto kunjungan ke Google Drive via OAuth:', oauthErr?.message);
    return {
      success: false,
      method: 'oauth',
      error: oauthErr?.message || 'Gagal mengunggah berkas ke Google Drive API',
    };
  }
}

/**
 * Pipeline Penyimpanan Terpadu Presensi Siswa:
 * 1. Simpan segera ke IndexedDB lokal.
 * 2. Unggah foto ke Google Drive jika akun Google terhubung.
 * 3. Simpan data ke Firebase Firestore Realtime.
 * 4. Jika offline, antrekan ke Offline Queue.
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

  // LANGKAH 1: Simpan ke IndexedDB lokal segera
  try {
    await savePresensiToIndexedDb(workingPresensi);
  } catch (idbErr) {
    console.warn('Gagal menyimpan presensi ke IndexedDB lokal:', idbErr);
  }

  // LANGKAH 2: Upload foto ke Google Drive
  if (isDeviceOnline && hasSelfieImage) {
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
        imageSyncStatus = 'pending-image-sync';
        workingPresensi.image_sync_status = 'pending-image-sync';
        if (driveRes.error) {
          report.errorMessages.push(`Google Drive: ${driveRes.error}`);
        }
      }
    } catch (err: any) {
      imageSyncStatus = 'pending-image-sync';
      workingPresensi.image_sync_status = 'pending-image-sync';
      report.errorMessages.push(`Google Drive: ${err?.message || 'Gagal memproses unggahan foto'}`);
    }
  }

  report.imageSyncStatus = imageSyncStatus;

  // LANGKAH 3: Simpan ke Firebase Firestore Realtime
  if (isDeviceOnline) {
    try {
      const firestoreSuccess = await savePresensiToFirestore(workingPresensi);
      if (firestoreSuccess) {
        report.databaseSuccess = true;
        report.databaseDestination = 'firestore';
        workingPresensi.is_offline_pending = false;
      } else {
        report.databaseDestination = 'offline_local';
        workingPresensi.is_offline_pending = true;
        saveToOfflineQueue(workingPresensi);
      }
    } catch (dbErr: any) {
      console.warn('Gagal simpan ke Firestore:', dbErr);
      report.databaseDestination = 'offline_local';
      workingPresensi.is_offline_pending = true;
      saveToOfflineQueue(workingPresensi);
    }
  } else {
    report.databaseDestination = 'offline_local';
    workingPresensi.is_offline_pending = true;
    saveToOfflineQueue(workingPresensi);
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
 * 2. Konversi dan unggah Blob foto ke Google Drive.
 * 3. Simpan data ke Firebase Firestore Realtime.
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

  // LANGKAH 2: Simpan Foto ke Google Drive
  if (isDeviceOnline && hasPhoto) {
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
      report.errorMessages.push(`Google Drive: ${err?.message || 'Gagal memproses unggahan foto'}`);
    }
  }

  report.imageSyncStatus = imageSyncStatus;

  // LANGKAH 3: Submisi Teks ke Firestore Realtime
  if (isDeviceOnline) {
    try {
      const firestoreSuccess = await saveKunjunganToFirestore(workingKunjungan);
      if (firestoreSuccess) {
        report.databaseSuccess = true;
        report.databaseDestination = 'firestore';
      }
    } catch (dbErr: any) {
      console.warn('Gagal simpan kunjungan ke Firestore:', dbErr);
    }
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
