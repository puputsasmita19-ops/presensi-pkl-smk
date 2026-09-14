import { getCachedAccessToken, isValidOAuthAccessToken } from './googleAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  directImageUrl?: string;
  iconLink?: string;
  createdTime?: string;
  size?: string;
}

export const DEFAULT_PKL_FOLDER_ID = '16J6-5viU-CVCconsfFTNtrMCNMx-0HNz';
export const FOLDER_NAME_SISWA = 'Foto Presensi Siswa';
export const FOLDER_NAME_GURU = 'Foto Monitoring & Kunjungan Guru';

let cachedPklFolderId: string | null = null;
let cachedFolderSiswaId: string | null = null;
let cachedFolderGuruId: string | null = null;

// ================= FOLDER UTAMA PKL =================
export const getCachedPklFolderId = (): string => {
  if (cachedPklFolderId && cachedPklFolderId.trim()) return cachedPklFolderId.trim();
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('pkl_gdrive_folder_id');
      if (saved && saved.trim()) {
        cachedPklFolderId = saved.trim();
        return saved.trim();
      }
    } catch {}
  }
  return DEFAULT_PKL_FOLDER_ID;
};

export const setCachedPklFolderId = (folderId: string) => {
  cachedPklFolderId = folderId.trim();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pkl_gdrive_folder_id', cachedPklFolderId);
    } catch {}
  }
};

export const resetCachedPklFolderId = () => {
  cachedPklFolderId = DEFAULT_PKL_FOLDER_ID;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pkl_gdrive_folder_id', DEFAULT_PKL_FOLDER_ID);
    } catch {}
  }
};

// ================= FOLDER KHUSUS SISWA =================
export const getCachedFolderSiswaId = (): string | null => {
  if (cachedFolderSiswaId && cachedFolderSiswaId.trim()) return cachedFolderSiswaId.trim();
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('pkl_gdrive_folder_siswa_id');
      if (saved && saved.trim()) {
        cachedFolderSiswaId = saved.trim();
        return saved.trim();
      }
    } catch {}
  }
  return null;
};

export const setCachedFolderSiswaId = (folderId: string) => {
  cachedFolderSiswaId = folderId.trim();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pkl_gdrive_folder_siswa_id', cachedFolderSiswaId);
    } catch {}
  }
};

export const resetCachedFolderSiswaId = () => {
  cachedFolderSiswaId = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('pkl_gdrive_folder_siswa_id');
    } catch {}
  }
};

// ================= FOLDER KHUSUS GURU =================
export const getCachedFolderGuruId = (): string | null => {
  if (cachedFolderGuruId && cachedFolderGuruId.trim()) return cachedFolderGuruId.trim();
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('pkl_gdrive_folder_guru_id');
      if (saved && saved.trim()) {
        cachedFolderGuruId = saved.trim();
        return saved.trim();
      }
    } catch {}
  }
  return null;
};

export const setCachedFolderGuruId = (folderId: string) => {
  cachedFolderGuruId = folderId.trim();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pkl_gdrive_folder_guru_id', cachedFolderGuruId);
    } catch {}
  }
};

export const resetCachedFolderGuruId = () => {
  cachedFolderGuruId = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('pkl_gdrive_folder_guru_id');
    } catch {}
  }
};

/**
 * Buat atau cari subfolder di dalam folder parent tertentu
 */
export const getOrCreateSubFolder = async (
  folderName: string,
  parentFolderId?: string
): Promise<string> => {
  const token = getCachedAccessToken();
  if (!token) {
    return parentFolderId || DEFAULT_PKL_FOLDER_ID;
  }

  const effectiveParent = parentFolderId || getCachedPklFolderId();

  try {
    let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (effectiveParent && effectiveParent !== 'root') {
      query += ` and '${effectiveParent}' in parents`;
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,webViewLink)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // Jika belum ada, buat subfolder baru
    const bodyPayload: Record<string, any> = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (effectiveParent && effectiveParent !== 'root') {
      bodyPayload.parents = [effectiveParent];
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      if (created.id) {
        // Berikan izin view agar dapat diakses
        makeDriveFilePublic(created.id).catch(() => {});
        return created.id;
      }
    }
  } catch (e) {
    console.warn(`Gagal mencari/membuat folder ${folderName}:`, e);
  }

  return effectiveParent || DEFAULT_PKL_FOLDER_ID;
};

/**
 * Dapatkan atau buat Folder Khusus Foto Presensi Siswa
 */
export const getOrCreateSiswaPresensiFolder = async (): Promise<string> => {
  const cached = getCachedFolderSiswaId();
  if (cached && cached.trim()) {
    return cached.trim();
  }

  const parentFolderId = await getOrCreatePklFolder();
  const folderId = await getOrCreateSubFolder(FOLDER_NAME_SISWA, parentFolderId);
  if (folderId) {
    setCachedFolderSiswaId(folderId);
    return folderId;
  }
  return parentFolderId;
};

/**
 * Dapatkan atau buat Folder Khusus Foto Monitoring & Kunjungan Guru
 */
export const getOrCreateGuruPresensiFolder = async (): Promise<string> => {
  const cached = getCachedFolderGuruId();
  if (cached && cached.trim()) {
    return cached.trim();
  }

  const parentFolderId = await getOrCreatePklFolder();
  const folderId = await getOrCreateSubFolder(FOLDER_NAME_GURU, parentFolderId);
  if (folderId) {
    setCachedFolderGuruId(folderId);
    return folderId;
  }
  return parentFolderId;
};

/**
 * Buat atau cari folder utama di Google Drive
 */
export const getOrCreatePklFolder = async (folderName = 'Presensi & Jurnal PKL SMK'): Promise<string> => {
  const current = getCachedPklFolderId();
  if (current && current.trim()) {
    return current.trim();
  }

  const token = getCachedAccessToken();
  if (!token) {
    return DEFAULT_PKL_FOLDER_ID;
  }

  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    )}&fields=files(id,name)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const foundId = searchData.files[0].id;
        setCachedPklFolderId(foundId);
        return foundId;
      }
    }

    // Jika tidak ada, buat folder baru
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      if (created.id) {
        setCachedPklFolderId(created.id);
        return created.id;
      }
    }
  } catch (e) {
    console.warn('Info folder Google Drive:', e);
  }

  return DEFAULT_PKL_FOLDER_ID;
};

/**
 * Atur hak akses file menjadi public / reader agar link foto dapat dibuka
 */
export const makeDriveFilePublic = async (fileId: string): Promise<boolean> => {
  const token = getCachedAccessToken();
  if (!token || !fileId) return false;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Ambil daftar file dari Google Drive
 */
export const listDriveFiles = async (folderId?: string): Promise<DriveFileItem[]> => {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Belum terhubung ke Google Drive. Silakan klik tombol "Hubungkan Google Drive".');
  }

  const targetFolder = folderId || getCachedPklFolderId();
  let query = 'trashed = false';
  if (targetFolder && targetFolder !== 'root') {
    query += ` and '${targetFolder}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,iconLink,createdTime,size)&pageSize=50&orderBy=createdTime desc`;

  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Jika folder spesifik gagal (404/403), fallback ke list semua file yang dibuat aplikasi
  if (!response.ok && targetFolder) {
    const fallbackUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      'trashed = false'
    )}&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,iconLink,createdTime,size)&pageSize=50&orderBy=createdTime desc`;
    response = await fetch(fallbackUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal mengambil daftar file dari Google Drive');
  }

  const data = await response.json();
  const rawFiles = data.files || [];

  return rawFiles.map((f: any) => ({
    ...f,
    directImageUrl: `https://lh3.googleusercontent.com/d/${f.id}`,
  }));
};

/**
 * Helper internal untuk membuat multipart/related body
 */
function buildMultipartBody(metadata: Record<string, any>, mediaBlob: Blob, mimeType: string, boundary: string): Blob {
  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: 'application/json; charset=UTF-8',
  });

  return new Blob(
    [
      `--${boundary}\r\n`,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadataBlob,
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${mimeType}\r\n\r\n`,
      mediaBlob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );
}

/**
 * Upload foto / berkas ke Google Drive secara terstruktur dan tahan kegagalan (Fault-Tolerant)
 */
export const uploadFileToDrive = async (
  fileName: string,
  content: string | Blob,
  mimeType = 'image/jpeg',
  folderId?: string
): Promise<DriveFileItem> => {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Akses token Google Drive tidak ditemukan. Silakan hubungkan Akun Google Anda.');
  }

  const targetFolderId = folderId || getCachedPklFolderId();

  // Siapkan media Blob
  let mediaBlob: Blob;
  if (typeof content === 'string') {
    if (content.startsWith('data:')) {
      const parts = content.split(',');
      const meta = parts[0];
      const rawBase64 = parts[1] || '';
      const detectedMime = meta.substring(5).split(';')[0] || mimeType;
      mimeType = detectedMime;
      const cleanB64 = rawBase64.replace(/[\r\n\s]+/g, '');
      const binStr = atob(cleanB64);
      const arr = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        arr[i] = binStr.charCodeAt(i);
      }
      mediaBlob = new Blob([arr], { type: mimeType });
    } else {
      mediaBlob = new Blob([content], { type: mimeType });
    }
  } else {
    mediaBlob = content;
    if (mediaBlob.type) {
      mimeType = mediaBlob.type;
    }
  }

  const boundary = '-------GDriveMultipart' + Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Metadata awal dengan target parent folder jika ada
  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: mimeType,
  };

  if (targetFolderId && targetFolderId.trim()) {
    metadata.parents = [targetFolderId.trim()];
  }

  const multipartBody = buildMultipartBody(metadata, mediaBlob, mimeType, boundary);

  const uploadEndpoint =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink,iconLink,createdTime,size,mimeType';

  let response = await fetch(uploadEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  // FALLBACK 1: Jika error 404/403/400 terkait parent folder ID (misal folder belum dibagikan atau invalid)
  if (!response.ok && targetFolderId && (response.status === 404 || response.status === 403 || response.status === 400)) {
    console.warn(`Upload ke folder ${targetFolderId} ditolak (${response.status}), mencoba upload ke Root My Drive...`);

    const rootMetadata: Record<string, any> = {
      name: fileName,
      mimeType: mimeType,
    };
    const rootBody = buildMultipartBody(rootMetadata, mediaBlob, mimeType, boundary);

    response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: rootBody,
    });
  }

  // FALLBACK 2: Jika multipart ditolak, coba direct media upload (uploadType=media)
  if (!response.ok && (response.status === 400 || response.status === 415)) {
    console.warn('Multipart upload ditolak, mencoba direct binary media upload...');
    const directUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=media&fields=id,name,webViewLink,webContentLink,thumbnailLink`;
    response = await fetch(directUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
      },
      body: mediaBlob,
    });

    if (response.ok) {
      const createdItem = await response.json();
      // Rename file
      if (createdItem.id) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${createdItem.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: fileName }),
          });
        } catch {}
      }
    }
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message =
      errorJson.error?.message ||
      `Gagal mengunggah foto ke Google Drive (Status HTTP ${response.status}: ${response.statusText})`;
    throw new Error(message);
  }

  const resultData: DriveFileItem = await response.json();

  // Jadikan file dapat dilihat via thumbnail / direct preview
  if (resultData.id) {
    makeDriveFilePublic(resultData.id).catch(() => {});
  }

  return {
    ...resultData,
    webViewLink: resultData.webViewLink || `https://drive.google.com/file/d/${resultData.id}/view`,
    webContentLink: resultData.webContentLink || `https://drive.google.com/uc?export=download&id=${resultData.id}`,
    thumbnailLink: `https://lh3.googleusercontent.com/d/${resultData.id}`,
    directImageUrl: `https://lh3.googleusercontent.com/d/${resultData.id}`,
  };
};
