import { getCachedAccessToken } from './googleAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  size?: string;
}

/**
 * List files in user's Google Drive (or inside PKL folder)
 */
export const listDriveFiles = async (folderId?: string): Promise<DriveFileItem[]> => {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Belum terhubung ke Google Drive. Silakan login dengan Akun Google.');
  }

  let query = "trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,webViewLink,iconLink,createdTime,size)&pageSize=30&orderBy=createdTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal mengambil daftar file dari Google Drive');
  }

  const data = await response.json();
  return data.files || [];
};

let cachedPklFolderId: string | null = null;

export const getCachedPklFolderId = (): string | null => {
  if (cachedPklFolderId) return cachedPklFolderId;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('pkl_gdrive_folder_id');
      if (saved) {
        cachedPklFolderId = saved;
        return saved;
      }
    } catch {}
  }
  return null;
};

export const resetCachedPklFolderId = () => {
  cachedPklFolderId = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('pkl_gdrive_folder_id');
    } catch {}
  }
};

/**
 * Create or locate a folder in Google Drive named "Presensi & Jurnal PKL SMK"
 */
export const getOrCreatePklFolder = async (folderName = 'Presensi & Jurnal PKL SMK'): Promise<string> => {
  const existingFolderId = getCachedPklFolderId();
  if (existingFolderId) {
    return existingFolderId;
  }

  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Token Google Drive tidak tersedia.');
  }

  // 1. Search existing folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  )}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      cachedPklFolderId = searchData.files[0].id;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pkl_gdrive_folder_id', cachedPklFolderId);
        } catch {}
      }
      return searchData.files[0].id;
    }
  }

  // 2. Create if not found
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

  if (!createRes.ok) {
    throw new Error('Gagal membuat folder di Google Drive');
  }

  const folderData = await createRes.json();
  cachedPklFolderId = folderData.id;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pkl_gdrive_folder_id', cachedPklFolderId);
    } catch {}
  }
  return folderData.id;
};

/**
 * Upload a text / JSON / blob file to Google Drive using standard multipart/related format
 */
export const uploadFileToDrive = async (
  fileName: string,
  content: string | Blob,
  mimeType = 'application/json',
  folderId?: string
): Promise<DriveFileItem> => {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Belum terhubung ke Google Drive. Silakan hubungkan akun Google Anda.');
  }

  const metadata: any = {
    name: fileName,
    mimeType: mimeType,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const metadataBlob = new Blob([JSON.stringify(metadata)], {
    type: 'application/json; charset=UTF-8',
  });

  const mediaBlob =
    typeof content === 'string'
      ? new Blob([content], { type: mimeType })
      : content;

  // Google Drive REST API v3 multipart/related boundary format
  const multipartBlob = new Blob(
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

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,iconLink,createdTime,size,mimeType',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBlob,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message =
      err.error?.message ||
      `Gagal mengunggah file ke Google Drive (Status: ${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  return await response.json();
};
