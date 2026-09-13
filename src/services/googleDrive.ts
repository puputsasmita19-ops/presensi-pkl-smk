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

export const getCachedPklFolderId = (): string | null => cachedPklFolderId;

export const resetCachedPklFolderId = () => {
  cachedPklFolderId = null;
};

/**
 * Create or locate a folder in Google Drive named "Presensi & Jurnal PKL SMK"
 */
export const getOrCreatePklFolder = async (folderName = 'Presensi & Jurnal PKL SMK'): Promise<string> => {
  if (cachedPklFolderId) {
    return cachedPklFolderId;
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
  return folderData.id;
};

/**
 * Upload a text / JSON / blob file to Google Drive
 */
export const uploadFileToDrive = async (
  fileName: string,
  content: string | Blob,
  mimeType = 'application/json',
  folderId?: string
): Promise<DriveFileItem> => {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Belum terhubung ke Google Drive.');
  }

  const metadata: any = {
    name: fileName,
    mimeType: mimeType,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );

  if (typeof content === 'string') {
    form.append('file', new Blob([content], { type: mimeType }));
  } else {
    form.append('file', content);
  }

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mengunggah file ke Google Drive');
  }

  return await response.json();
};
